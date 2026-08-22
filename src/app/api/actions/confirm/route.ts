import { NextRequest, NextResponse } from "next/server";
import { confirmAction, cancelAction, getActions } from "@/lib/data/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionId, intent = "confirm" } = body;

    if (!actionId) {
      return NextResponse.json({ error: "actionId is required" }, { status: 400 });
    }

    if (intent === "cancel") {
      const result = await cancelAction(actionId);
      return NextResponse.json(result);
    }

    const result = await confirmAction(actionId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const actions = await getActions();
  return NextResponse.json({ actions });
}
