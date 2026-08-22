import { NextResponse } from "next/server";
import { generateProactiveAlerts } from "@/lib/proactive/engine";

export async function GET() {
  try {
    const data = await generateProactiveAlerts();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
