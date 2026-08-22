"use client";

import React, { useState, useEffect } from "react";
import { PendingAction } from "@/lib/types";
import { FileCheck2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

export function ActionsAuditLog() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = () => {
    setLoading(true);
    fetch("/api/actions/confirm")
      .then((res) => res.json())
      .then((d) => setActions(d.actions || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchActions();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            Confirmed Actions Audit Trail & Log
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            PostgreSQL record of all human-confirmed escalations, credit claims, and ticket updates
          </p>
        </div>

        <button
          onClick={fetchActions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Log</span>
        </button>
      </header>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto space-y-4 w-full">
        {actions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <p className="text-sm font-mono">No confirmed actions yet in this session.</p>
            <p className="text-xs text-slate-500 mt-1">
              Actions will appear here as you confirm them in the Chat Copilot or Proactive Scanner.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((act) => (
              <div
                key={act.action_id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {act.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{act.action_id}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{act.confirmed_at || act.created_at}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">{act.payload.title}</h3>
                <p className="text-xs text-slate-300">{act.payload.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div>Type: <span className="text-teal-400">{act.action_type}</span></div>
                  <div>Account: <span className="text-slate-200">{act.payload.account_id || "N/A"}</span></div>
                  <div>Amount: <span className="text-emerald-400 font-bold">{act.payload.credit_amount_inr ? `INR ${act.payload.credit_amount_inr}` : "N/A"}</span></div>
                  <div>Assignee: <span className="text-slate-300">{act.payload.recommended_assignee || "Ops"}</span></div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  <span className="font-semibold text-teal-400">Governing Source:</span> {act.payload.governing_source}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
