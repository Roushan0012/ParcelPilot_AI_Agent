import { AGENT_TOOLS, executeTool } from "./tools";
import { getSystemPrompt } from "./prompts";
import { AuthContext } from "../data/db";
import { ChatMessage, ToolCallEvent, Citation, PendingAction } from "../types";
import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";

function getGroqClient() {
  const key = process.env.GROQ_API_KEY || "";
  return new Groq({ apiKey: key });
}

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY || "";
  return new Anthropic({ apiKey: key });
}

export interface AgentRunResult {
  message: string;
  toolCalls: ToolCallEvent[];
  pendingAction?: PendingAction | null;
  citations: Citation[];
}

export async function runAgentConversation(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  auth: AuthContext
): Promise<AgentRunResult> {
  const systemPrompt = getSystemPrompt(auth.role, auth.accountId);
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

  // Attempt with Groq (or Anthropic if key has balance)
  let conversationMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const maxSteps = 5;
  let currentStep = 0;

  while (currentStep < maxSteps) {
    currentStep++;

    try {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: conversationMessages,
        tools: groqTools,
        tool_choice: "auto",
        temperature: 0.1,
      });

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
        // Final assistant text response
        return {
          message: assistantMsg.content || "Completed inquiry.",
          toolCalls: toolCallsLog,
          pendingAction,
          citations: accumulatedCitations,
        };
      }
    } catch (err: any) {
      console.error("Agent loop error on step", currentStep, err);
      // If Groq has an issue, try Anthropic or return safe message
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

  return {
    message: "Completed reasoning across operational records and documents.",
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

  let finalText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      finalText += block.text;
    }
  }

  return {
    message: finalText || "Processed query.",
    toolCalls: toolCallsLog,
    pendingAction,
    citations,
  };
}
