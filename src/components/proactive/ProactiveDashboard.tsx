"use client";

import React, { useState, useEffect } from "react";
import { ProactiveAlert } from "@/lib/types";
import { ActionConfirmationCard } from "../chat/ActionConfirmationCard";
import { 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  RefreshCw, 
  Building2, 
  FileText, 
  TrendingUp,
  Loader2
} from "lucide-react";

export function ProactiveDashboard() {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotTime, setSnapshotTime] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proactive");
      const data = await res.json();
      setAlerts(data.alerts || []);
      setSnapshotTime(data.snapshot_time || "");
    } catch (err) {
      console.error("Failed to load proactive alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredAlerts = filterSeverity === "all"
    ? alerts
    : alerts.filter((a) => a.severity === filterSeverity);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;
  const mediumCount = alerts.filter((a) => a.severity === "medium").length;

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-y-auto">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Proactive Issue Detection & Operations Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold">
              {alerts.length} ANOMALIES DETECTED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated anomaly scanning across tickets, orders & SLA contracts anchored to snapshot{" "}
            <span className="font-mono text-teal-400">{snapshotTime || "2026-08-16 11:00 IST"}</span>
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Rescan Data</span>
        </button>
      </header>

      {/* Main Body */}
      <div className="p-6 max-w-6xl mx-auto space-y-6 w-full">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 shadow-lg flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono text-rose-400 uppercase font-semibold">Critical SLA Breaches</div>
              <div className="text-2xl font-bold text-rose-200 mt-1">{criticalCount}</div>
              <p className="text-[10px] text-rose-300/80 mt-0.5">Immediate P1 escalation required</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 shadow-lg flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono text-amber-400 uppercase font-semibold">Carrier Fault Credits</div>
              <div className="text-2xl font-bold text-amber-200 mt-1">{highCount}</div>
              <p className="text-[10px] text-amber-300/80 mt-0.5">Unclaimed contractual service credits</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 shadow-lg flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono text-sky-400 uppercase font-semibold">Product Defect Patterns</div>
              <div className="text-2xl font-bold text-sky-200 mt-1">{mediumCount}</div>
              <p className="text-[10px] text-sky-300/80 mt-0.5">Correlated with Known Issues KI-208 / KI-211</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Filter:</span>
          {["all", "critical", "high", "medium", "info"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterSeverity === sev
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Alerts Feed */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
            <p className="text-sm font-mono">Running proactive anomaly engine across orders and tickets...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3 transition-all hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          alert.severity === "critical"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : alert.severity === "high"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        }`}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.affected_entity.account_name && (
                        <span className="text-xs font-semibold text-teal-400 font-mono">
                          {alert.affected_entity.account_name} ({alert.affected_entity.account_id})
                        </span>
                      )}
                      {alert.affected_entity.ticket_id && (
                        <span className="text-xs font-mono text-sky-400">[{alert.affected_entity.ticket_id}]</span>
                      )}
                      {alert.affected_entity.order_id && (
                        <span className="text-xs font-mono text-sky-400">[{alert.affected_entity.order_id}]</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-100">{alert.title}</h3>
                    <p className="text-xs text-slate-300 mt-1">{alert.summary}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
                  <div><span className="font-semibold text-slate-400">Analysis:</span> {alert.details}</div>
                  <div><span className="font-semibold text-teal-400">Recommended Action:</span> {alert.actionable_recommendation}</div>
                  <div className="text-[11px] text-slate-500 font-mono"><span className="text-slate-400">Governing Citation:</span> {alert.source_citation}</div>
                </div>

                {/* Proposed Action Confirmation Card if action is attached */}
                {alert.proposed_action && (
                  <div className="pt-1">
                    <ActionConfirmationCard action={alert.proposed_action} />
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
