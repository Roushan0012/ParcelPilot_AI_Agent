"use client";

import React, { useState, useEffect } from "react";
import { EvalLog, EvalMetricsSummary, UserRole } from "@/lib/types";
import { 
  Activity, 
  Zap, 
  Coins, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Server,
  TrendingDown,
  BarChart3,
  Wrench
} from "lucide-react";

interface EvaluationDashboardProps {
  role: UserRole;
}

export function EvaluationDashboard({ role }: EvaluationDashboardProps) {
  const [metrics, setMetrics] = useState<EvalMetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await fetch(`/api/eval?role=${role}`);
      if (res.status === 403) {
        setAccessDenied(true);
        setMetrics(null);
        return;
      }
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load evaluation metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [role]);

  if (accessDenied || role === "customer_mock") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300 max-w-md space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold">Access Restricted</h2>
          <p className="text-xs text-slate-300">
            Evaluation metrics, latency charts, and token cost logs are restricted to internal operations staff (<span className="font-mono text-teal-300">ops_manager</span>).
          </p>
          <p className="text-[11px] text-slate-400">
            Switch your role in the left sidebar to <span className="font-semibold text-slate-200">Ops Manager</span> to view internal performance observability.
          </p>
        </div>
      </div>
    );
  }

  const logs = metrics?.logs || [];
  const maxLatency = Math.max(...logs.map((l) => l.latency_ms), 1000);

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-y-auto">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              Evaluation & Observability Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-mono font-bold">
              LIVE METRICS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time latency, token usage, tool call counts, and estimated cost tracking for agent inquiries
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Stats</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-6xl mx-auto space-y-6 w-full">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {/* Avg Latency */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Avg Latency</span>
              <Clock className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xl font-bold text-slate-100 mt-2 font-mono">
              {metrics ? `${metrics.avg_latency_ms} ms` : "0 ms"}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Last 20 interaction turns</p>
          </div>

          {/* Total Tokens */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Total Tokens</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-300 mt-2 font-mono">
              {metrics ? metrics.total_tokens.toLocaleString() : "0"}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Session: {metrics ? metrics.session_tokens.toLocaleString() : 0}
            </p>
          </div>

          {/* Estimated Cost */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Est. Cost</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-2 font-mono">
              {metrics ? `$${metrics.total_cost_usd.toFixed(4)}` : "$0.0000"}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Token-based pricing</p>
          </div>

          {/* Total Queries */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Queries Run</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-sky-300 mt-2 font-mono">
              {metrics ? metrics.total_queries : 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Inquiry cycles recorded</p>
          </div>

          {/* Error Rate */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Error Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-xl font-bold mt-2 font-mono ${metrics && metrics.error_rate_pct > 0 ? "text-rose-400" : "text-emerald-300"}`}>
              {metrics ? `${metrics.error_rate_pct}%` : "0%"}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">API & reasoning success</p>
          </div>
        </div>

        {/* Visual Chart: Latency per Interaction */}
        {logs.length > 0 && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-400" />
                Interaction Latency History (ms)
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Recent {Math.min(15, logs.length)} turns</span>
            </div>

            <div className="h-28 flex items-end gap-2 pt-4 px-2 border-b border-slate-800">
              {logs.slice(0, 15).reverse().map((log, idx) => {
                const heightPct = Math.max(12, Math.round((log.latency_ms / maxLatency) * 100));
                return (
                  <div key={log.id || idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                      {log.latency_ms}ms
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        log.status === "error"
                          ? "bg-rose-500/80"
                          : log.latency_ms > 3000
                          ? "bg-amber-500/80"
                          : "bg-teal-500/80 hover:bg-teal-400"
                      }`}
                    />
                    <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">
                      #{logs.length - idx}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Interactions Table */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              Recent Interaction Logs ({logs.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Stored in Supabase `eval_logs`</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No interactions recorded yet. Ask a query in the chat or use voice input to generate live observability metrics!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-xs divide-y divide-slate-800 font-sans">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Time</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Query</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Latency</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Tokens (In / Out)</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Tools Used</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Est. Cost</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 bg-slate-900/40 text-slate-300">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>

                      {/* Query (Truncated) */}
                      <td className="px-3.5 py-2.5 max-w-xs truncate text-slate-200" title={l.query}>
                        {l.query}
                      </td>

                      {/* Latency */}
                      <td className="px-3.5 py-2.5 font-mono text-teal-300 whitespace-nowrap">
                        {l.latency_ms} ms
                      </td>

                      {/* Tokens */}
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        <span className="text-sky-300">{l.input_tokens}</span> / <span className="text-amber-300">{l.output_tokens}</span>
                      </td>

                      {/* Tools Used */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {l.tools_called && l.tools_called.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {l.tools_called.map((tool, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-950 text-teal-300 border border-slate-800 font-mono text-[10px]"
                              >
                                {tool.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Direct / None</span>
                        )}
                      </td>

                      {/* Estimated Cost */}
                      <td className="px-3.5 py-2.5 font-mono text-emerald-400 whitespace-nowrap">
                        ${l.estimated_cost_usd?.toFixed(5) || "0.00000"}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {l.status === "success" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                            OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold" title={l.error_message || ""}>
                            ERR
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
