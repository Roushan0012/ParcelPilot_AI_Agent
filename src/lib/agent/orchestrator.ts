import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS, executeTool } from "./tools";
import { getSystemPrompt } from "./prompts";
import { AgentRunResult, ToolCallEvent, PendingAction, Citation } from "../types";
import { AuthContext } from "../data/db";

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not configured.");
  }
  return new Groq({ apiKey });
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not configured.");
  }
  return new Anthropic({ apiKey });
}

export const runAgentConversation = runAgentOrchestrator;
export const runAgent = runAgentOrchestrator;

export async function runAgentOrchestrator(
  messages: { role: string; content: string }[],
  auth: AuthContext
): Promise<AgentRunResult> {
  const systemPrompt = getSystemPrompt(auth.role, auth.accountScope);
  const toolCallsLog: ToolCallEvent[] = [];
  const accumulatedCitations: Citation[] = [];
  let pendingAction: PendingAction | null = null;

  // Format tools for OpenAI / Groq tool-use API format
  const groqTools = AGENT_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  // Build message history
  let conversationMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const maxSteps = 6;
  let currentStep = 0;
  const groq = getGroqClient();

  while (currentStep < maxSteps) {
    currentStep++;

    try {
      let completion: any;
      const candidateModels = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"];
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          completion = await groq.chat.completions.create({
            model: modelName,
            messages: conversationMessages,
            tools: groqTools,
            tool_choice: "auto",
            temperature: 0.1,
          });
          if (completion) break;
        } catch (mErr: any) {
          lastErr = mErr;
          if (mErr?.status === 429 || mErr?.message?.includes("rate_limit") || mErr?.status === 404) {
            continue;
          }
          throw mErr;
        }
      }

      if (!completion && lastErr) {
        throw lastErr;
      }

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      // If the model wants to call tools
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        conversationMessages.push({
          role: "assistant",
          content: assistantMsg.content || null,
          tool_calls: assistantMsg.tool_calls,
        });

        for (const tc of assistantMsg.tool_calls) {
          const toolName = tc.function.name;
          let toolArgs: any = {};
          try {
            toolArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch (e) {
            toolArgs = {};
          }

          const toolEvent: ToolCallEvent = {
            tool_id: tc.id,
            tool_name: toolName,
            args: toolArgs,
            status: "executing",
            timestamp: new Date().toISOString(),
          };

          try {
            const { result, pendingAction: pa, citations } = await executeTool(toolName, toolArgs, auth);
            toolEvent.result = result;
            toolEvent.status = "completed";
            if (pa) {
              pendingAction = pa;
            }
            if (citations) {
              for (const c of citations) {
                if (!accumulatedCitations.some((existing) => existing.id === c.id)) {
                  accumulatedCitations.push(c);
                }
              }
            }

            conversationMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          } catch (toolErr: any) {
            toolEvent.status = "failed";
            toolEvent.result = { error: toolErr.message };
            conversationMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({ error: toolErr.message }),
            });
          }

          toolCallsLog.push(toolEvent);
        }
      } else {
        // Final assistant text response produced directly
        if (assistantMsg.content && assistantMsg.content.trim().length > 0) {
          return {
            message: assistantMsg.content,
            toolCalls: toolCallsLog,
            pendingAction,
            citations: accumulatedCitations,
          };
        }
      }
    } catch (err: any) {
      console.error("Agent loop error on step", currentStep, err);
      try {
        return await runAnthropicFallback(messages, systemPrompt, auth, toolCallsLog, accumulatedCitations, pendingAction);
      } catch (anthropicErr) {
        return {
          message: `I encountered an operational reasoning error: ${err.message}. Please verify the query and try again.`,
          toolCalls: toolCallsLog,
          pendingAction,
          citations: accumulatedCitations,
        };
      }
    }
  }

  // If tools were called and we need a final synthesized text response, do a final synthesis call with tool_choice "none"
  try {
    const candidateModels = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"];
    let finalCompletion: any;

    for (const modelName of candidateModels) {
      try {
        finalCompletion = await groq.chat.completions.create({
          model: modelName,
          messages: [
            ...conversationMessages,
            {
              role: "user",
              content: "Provide a complete, comprehensive, authoritative operational answer addressing all user questions. State the verdict clearly, explain the timeline relative to snapshot (2026-08-16 11:00 IST), cite the exact document and clause, and summarize the required escalation action.",
            },
          ],
          temperature: 0.1,
        });
        if (finalCompletion) break;
      } catch (mErr: any) {
        if (mErr?.status === 429 || mErr?.message?.includes("rate_limit") || mErr?.status === 404) {
          continue;
        }
        throw mErr;
      }
    }

    const finalAnswer = finalCompletion?.choices[0]?.message?.content;
    if (finalAnswer && finalAnswer.trim().length > 0) {
      return {
        message: finalAnswer,
        toolCalls: toolCallsLog,
        pendingAction,
        citations: accumulatedCitations,
      };
    }
  } catch (synthErr) {
    console.error("Synthesis error:", synthErr);
  }

  return {
    message: "Completed operational review. Please check the tool activity events and citations above for details.",
    toolCalls: toolCallsLog,
    pendingAction,
    citations: accumulatedCitations,
  };
}

async function runAnthropicFallback(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  auth: AuthContext,
  toolCallsLog: ToolCallEvent[],
  citations: Citation[],
  pendingAction: PendingAction | null
): Promise<AgentRunResult> {
  const anthropicTools: Anthropic.Tool[] = AGENT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object",
      properties: t.parameters.properties,
      required: t.parameters.required,
    },
  }));

  const anthropicMessages: Anthropic.MessageParam[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1500,
    system: systemPrompt,
    messages: anthropicMessages,
    tools: anthropicTools,
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  const messageText = textBlocks.map((b: any) => b.text).join("\n\n");

  return {
    message: messageText || "Inquiry processed successfully.",
    toolCalls: toolCallsLog,
    pendingAction,
    citations,
  };
}
