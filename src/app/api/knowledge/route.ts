import { NextResponse } from "next/server";
import dataset from "@/lib/data/dataset.json";

export async function GET() {
  return NextResponse.json({
    metadata: dataset.metadata,
    snapshot_time: dataset.snapshot_time,
    document_chunks: dataset.document_chunks,
    accounts: dataset.accounts,
    orders: dataset.orders,
    tickets: dataset.tickets,
  });
}
