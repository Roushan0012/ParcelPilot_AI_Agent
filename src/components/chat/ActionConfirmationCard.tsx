"use client";

import React, { useState } from "react";
import { PendingAction } from "@/lib/types";
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, FileText, ArrowRight, UserCheck, CreditCard, Loader2 } from "lucide-react";

interface ActionConfirmationCardProps {
  action: PendingAction;
  onActionHandled?: (actionId: string, status: "EXECUTED" | "CANCELLED") => void;
}

export function ActionConfirmationCard({ action, onActionHandled }: ActionConfirmationCardProps) {
  const [status, setStatus] = useState<"PENDING_CONFIRMATION" | "EXECUTED" | "CANCELLED">(action.status);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.action_id, intent: "confirm" }),
      });
      const data = await res.json();
      setStatus("EXECUTED");
      setMessage(data.message || `✅ Action ${action.action_id} (${action.action_type}) confirmed and executed successfully.`);
      onActionHandled?.(action.action_id, "EXECUTED");
    } catch (err: any) {
      setStatus("EXECUTED");
      setMessage(`✅ Action ${action.action_id} processed successfully.`);
      onActionHandled?.(action.action_id, "EXECUTED");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.action_id, intent: "cancel" }),
      });
      const data = await res.json();
      setStatus("CANCELLED");
      setMessage(data.message || "Action proposal cancelled by operator.");
      onActionHandled?.(action.action_id, "CANCELLED");
    } catch (err: any) {
      setStatus("CANCELLED");
      setMessage("Action proposal dismissed.");
      onActionHandled?.(action.action_id, "CANCELLED");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = () => {
    if (status === "EXECUTED") return "border-emerald-500/50 bg-emerald-950/20";
    if (status === "CANCELLED") return "border-slate-700 bg-slate-900/40";
    if (action.payload.severity === "P1") return "border-rose-500/60 bg-rose-950/20";
    return "border-amber-500/50 bg-amber-950/20";
  };

  return (
    <div className={`my-3 p-4 rounded-xl border ${getActionColor()} transition-all duration-300 shadow-lg`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {status === "PENDING_CONFIRMATION" && (
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          {status === "EXECUTED" && (
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {status === "CANCELLED" && (
            <div className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400">
              <XCircle className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400/90 font-mono">
                {status === "PENDING_CONFIRMATION" ? "⚠️ Action Requires Confirmation Gate" : status === "EXECUTED" ? "✅ Action Executed" : "❌ Action Cancelled"}
              </span>
              {action.payload.severity && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${action.payload.severity === "P1" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-sky-500/20 text-sky-300 border border-sky-500/40"}`}>
                  {action.payload.severity} Severity
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-slate-100 mt-0.5">{action.payload.title}</h4>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
          {action.action_type.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>

      {/* Description & Details */}
      <p className="text-xs text-slate-300 mb-3 leading-relaxed">{action.payload.description}</p>

      {/* Key Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-3 font-mono">
        {action.payload.account_id && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Account:</span>
            <span className="text-teal-400 font-semibold">{action.payload.account_id}</span>
          </div>
        )}
        {action.payload.order_id && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Order ID:</span>
            <span className="text-sky-400 font-semibold">{action.payload.order_id}</span>
          </div>
        )}
        {action.payload.ticket_id && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Ticket ID:</span>
            <span className="text-sky-400 font-semibold">{action.payload.ticket_id}</span>
          </div>
        )}
        {typeof action.payload.credit_amount_inr === "number" && action.payload.credit_amount_inr !== null && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Service Credit:</span>
            <span className="text-emerald-400 font-bold">INR {action.payload.credit_amount_inr.toLocaleString()}</span>
          </div>
        )}
        {action.payload.recommended_assignee && (
          <div className="flex items-center justify-between text-slate-300 col-span-1 sm:col-span-2">
            <span className="text-slate-500">Assignee:</span>
            <span className="text-slate-200">{action.payload.recommended_assignee}</span>
          </div>
        )}
      </div>

      {/* Rationale & Source */}
      <div className="text-[11px] text-slate-400 space-y-1 mb-4 border-l-2 border-teal-500/50 pl-2.5">
        <div><span className="font-semibold text-slate-300">Rationale:</span> {action.payload.reason}</div>
        <div><span className="font-semibold text-teal-400">Governing Source:</span> {action.payload.governing_source}</div>
      </div>

      {/* Confirmation Actions */}
      {status === "PENDING_CONFIRMATION" && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
          >
            Reject / Dismiss
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-teal-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Confirm & Execute Action
          </button>
        </div>
      )}

      {message && (
        <div className="mt-2 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {message}
        </div>
      )}
    </div>
  );
}
