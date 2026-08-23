import { NextRequest, NextResponse } from "next/server";
import { runAgentConversation } from "@/lib/agent/orchestrator";
import { UserRole } from "@/lib/types";
import { createEvalLog } from "@/lib/data/db";

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  let latestQuery = "";
  let userRole = "ops_manager";
  let targetAccountId: string | undefined = undefined;

  try {
    const body = await req.json();
    const { messages, role = "ops_manager", accountId } = body;
    userRole = role;
    targetAccountId = accountId;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages payload." }, { status: 400 });
    }

    latestQuery = messages[messages.length - 1]?.content || "";

    const authContext = {
      role: role as UserRole,
      accountId: accountId || undefined,
    };

    const result = await runAgentConversation(messages, authContext);
    const latency_ms = performance.now() - startTime;

    // Fire-and-forget evaluation logger (non-blocking)
    const inputTokensEstimate = Math.max(120, Math.round(latestQuery.length * 1.3) + (result.toolCalls.length * 350));
    const outputTokensEstimate = Math.max(60, Math.round((result.message || "").length * 0.75));

    createEvalLog({
      query: latestQuery,
      latency_ms,
      input_tokens: result.usage?.input_tokens || inputTokensEstimate,
      output_tokens: result.usage?.output_tokens || outputTokensEstimate,
      tools_called: result.toolCalls.map((tc) => tc.tool_name),
      model: result.model || "openai/gpt-oss-120b",
      status: "success",
      role: userRole,
      account_id: targetAccountId,
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error: any) {
    const latency_ms = performance.now() - startTime;
    console.error("Chat API error:", error);

    createEvalLog({
      query: latestQuery || "Unknown query",
      latency_ms,
      input_tokens: 50,
      output_tokens: 0,
      tools_called: [],
      model: "openai/gpt-oss-120b",
      status: "error",
      error_message: error.message,
      role: userRole,
      account_id: targetAccountId,
    }).catch(() => {});

    return NextResponse.json(
      { error: error.message || "Failed to process chat conversation." },
      { status: 500 }
    );
  }
}
