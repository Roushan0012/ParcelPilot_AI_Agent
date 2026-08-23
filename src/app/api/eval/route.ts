import { NextRequest, NextResponse } from "next/server";
import { getEvalMetrics } from "@/lib/data/db";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get("role") || "ops_manager") as UserRole;
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    // RLS: Only ops_manager and authorized internal support agents can access evaluation metrics
    if (role === "customer_mock") {
      return NextResponse.json(
        { error: "Access Denied: Evaluation metrics and observability logs are restricted to operations staff." },
        { status: 403 }
      );
    }

    const authContext = { role };
    const metrics = await getEvalMetrics(authContext, limit);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("Evaluation metrics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch evaluation metrics." },
      { status: 500 }
    );
  }
}
