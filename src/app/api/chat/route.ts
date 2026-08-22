import { NextRequest, NextResponse } from "next/server";
import { runAgentConversation } from "@/lib/agent/orchestrator";
import { UserRole } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, role = "ops_manager", accountId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages payload." }, { status: 400 });
    }

    const authContext = {
      role: role as UserRole,
      accountId: accountId || undefined,
    };

    const result = await runAgentConversation(messages, authContext);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat conversation." },
      { status: 500 }
    );
  }
}
