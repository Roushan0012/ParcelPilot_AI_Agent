"use client";

import React, { useState, useEffect } from "react";
import { DocumentChunk, Account, Order, Ticket } from "@/lib/types";
import { 
  BookOpen, 
  FileText, 
  Database, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  Calendar,
  Building2,
  Package,
  Ticket as TicketIcon
} from "lucide-react";

export function KnowledgeExplorer() {
  const [activeSection, setActiveSection] = useState<"documents" | "accounts" | "orders" | "tickets">("documents");
  const [data, setData] = useState<{
    document_chunks: DocumentChunk[];
    accounts: Account[];
    orders: Order[];
    tickets: Ticket[];
    snapshot_time: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/knowledge")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Failed to load knowledge base:", err));
  }, []);

  if (!data) {
    return (
      <div className="flex-1 p-12 text-center text-slate-400 font-mono text-xs">
        Loading knowledge base & documents...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            Knowledge Base, Policies & Operational Data
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Indexed vector chunks with source authority tiers + normalized PostgreSQL tables
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSection("documents")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "documents" ? "bg-teal-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Policy Documents ({data.document_chunks.length})
          </button>
          <button
            onClick={() => setActiveSection("accounts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "accounts" ? "bg-teal-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Accounts ({data.accounts.length})
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "orders" ? "bg-teal-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Orders ({data.orders.length})
          </button>
          <button
            onClick={() => setActiveSection("tickets")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "tickets" ? "bg-teal-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Tickets ({data.tickets.length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-6xl mx-auto space-y-4 w-full">
        {/* Document Chunks Tab */}
        {activeSection === "documents" && (
          <div className="space-y-3">
            {data.document_chunks.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        c.authority_level === 1
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : c.authority_level === 2
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {c.authority_level === 1 ? "TIER 1 (Signed Agreement)" : c.authority_level === 2 ? "TIER 2 (Current Policy/SOP)" : "TIER 3 (Ops Guide)"}
                    </span>
                    <span className="text-xs font-bold text-slate-100">{c.doc_title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded">
                    {c.source_name} • Scope: {c.customer_scope}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-200">
                  <h4 className="font-semibold text-teal-400 font-mono text-xs mb-1">{c.section_title}</h4>
                  <p className="whitespace-pre-wrap leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accounts Tab */}
        {activeSection === "accounts" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.accounts.map((a) => (
              <div key={a.account_id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-400">{a.account_id}</span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-semibold">
                    {a.plan} Plan
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">{a.account_name}</h3>
                <p className="text-xs text-slate-300">{a.notes}</p>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  CSM: <span className="text-slate-200">{a.csm || "None"}</span> • Custom Contract:{" "}
                  <span className="text-teal-300">{a.contract_file || "Standard"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders Tab */}
        {activeSection === "orders" && (
          <div className="space-y-3">
            {data.orders.map((o) => (
              <div key={o.order_id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-400">{o.order_id}</span>
                    <span className="text-xs text-slate-400">Account: <span className="text-teal-300 font-mono font-semibold">{o.account_id}</span></span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    o.status === "BOOKED" ? "bg-amber-500/20 text-amber-300" : o.status === "PICKED_UP" ? "bg-teal-500/20 text-teal-300" : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {o.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950/70 p-3 rounded-xl">
                  <div>Carrier: <span className="text-slate-200">{o.carrier}</span></div>
                  <div>Fee: <span className="text-emerald-400 font-bold">INR {o.shipment_fee_inr}</span></div>
                  <div>Carrier Fault: <span className={o.carrier_fault ? "text-rose-400 font-bold" : "text-slate-400"}>{String(o.carrier_fault)}</span></div>
                  <div>Booked: <span className="text-slate-300">{o.booked_at}</span></div>
                </div>
                {o.notes && <p className="text-xs text-slate-400">{o.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Tickets Tab */}
        {activeSection === "tickets" && (
          <div className="space-y-3">
            {data.tickets.map((t) => (
              <div key={t.ticket_id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-400">{t.ticket_id}</span>
                    <span className="text-xs font-semibold text-slate-200">{t.subject}</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-slate-950 px-2 py-0.5 rounded">
                    {t.account_id}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{t.description}</p>
                {t.historical_resolution && (
                  <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 font-mono">
                    <span className="font-bold">Historical Note (Context Only):</span> {t.historical_resolution}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
