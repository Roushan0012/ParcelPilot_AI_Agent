"use client";

import React from "react";
import { UserRole } from "@/lib/types";
import { 
  Bot, 
  Clock, 
  UserCheck, 
  MessageSquare, 
  AlertTriangle, 
  BookOpen, 
  FileCheck2, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  Zap
} from "lucide-react";

interface SidebarProps {
  activeTab: "chat" | "proactive" | "knowledge" | "actions";
  setActiveTab: (tab: "chat" | "proactive" | "knowledge" | "actions") => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  accountScope: string;
  setAccountScope: (scope: string) => void;
  onSelectPrompt: (prompt: string) => void;
  criticalAlertCount: number;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  role,
  setRole,
  accountScope,
  setAccountScope,
  onSelectPrompt,
  criticalAlertCount,
}: SidebarProps) {
  const samplePrompts = [
    {
      title: "Northstar Cancellation Waiver",
      prompt: "Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.",
      tag: "Agreement Override",
    },
    {
      title: "Standard Service Credit Policy",
      prompt: "A pickup is three hours late because of carrier fault. Should I get a service credit? What is the standard calculation and approval limit?",
      tag: "SOP v4",
    },
    {
      title: "LumenWorks ORD-2002 Credit Claim",
      prompt: "Check order ORD-2002 for LumenWorks. Why was pickup delayed, what credit applies under their contract, and propose the credit action.",
      tag: "Multi-Step & Action",
    },
    {
      title: "P1 Outage & SLA Compliance",
      prompt: "Check ticket TKT-501 for Northstar. Is the 15-minute P1 SLA compliant relative to the snapshot time?",
      tag: "SLA Breach",
    },
  ];

  return (
    <aside className="w-80 border-r border-slate-800/80 bg-slate-950/90 flex flex-col h-screen flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 tracking-tight">ParcelPilot</span>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-mono font-semibold">
                AI OPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Internal Operations Agent</p>
          </div>
        </div>

        {/* Snapshot Time Anchor Banner */}
        <div className="mt-3 p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-[11px] font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 animate-pulse" />
          <div className="truncate">
            <span className="text-slate-500 block text-[9px] uppercase tracking-wider">System Snapshot "Now"</span>
            <span className="text-teal-300 font-semibold">2026-08-16 11:00 IST</span>
          </div>
        </div>
      </div>

      {/* Role Switcher (Mock Auth & RLS Context) */}
      <div className="p-3 border-b border-slate-800/60 bg-slate-900/20">
        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-1.5 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-teal-400" /> Active Session (RLS Role)
        </label>
        <select
          value={`${role}:${accountScope}`}
          onChange={(e) => {
            const [r, s] = e.target.value.split(":");
            setRole(r as UserRole);
            setAccountScope(s);
          }}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition-colors font-medium cursor-pointer"
        >
          <option value="ops_manager:">Ops Manager (Global All-Accounts)</option>
          <option value="support_agent:ACCT-001">Support Agent (Northstar — ACCT-001)</option>
          <option value="support_agent:ACCT-002">Support Agent (LumenWorks — ACCT-002)</option>
          <option value="support_agent:">Support Agent (General Access)</option>
          <option value="customer_mock:ACCT-001">Customer View (Northstar Scoped)</option>
        </select>
      </div>

      {/* Navigation Tabs */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => setActiveTab("chat")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === "chat"
              ? "bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4" />
            <span>AI Operations Chat</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
        </button>

        <button
          onClick={() => setActiveTab("proactive")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === "proactive"
              ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Proactive Issue Scanner</span>
          </div>
          {criticalAlertCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
              {criticalAlertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("knowledge")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === "knowledge"
              ? "bg-sky-500/10 text-sky-300 border border-sky-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Knowledge Base & Agreements</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("actions")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === "actions"
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>Confirmed Actions Audit Log</span>
          </div>
        </button>
      </div>

      {/* Suggested Multi-Step Scenarios */}
      <div className="flex-1 overflow-y-auto px-3 py-2 border-t border-slate-800/60 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold px-1">
          <Sparkles className="w-3 h-3 text-teal-400" /> Multi-Step Prompt Starters
        </div>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setActiveTab("chat");
              onSelectPrompt(p.prompt);
            }}
            className="w-full text-left p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700 text-xs transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200 group-hover:text-teal-300 transition-colors text-[11px]">
                {p.title}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                {p.tag}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{p.prompt}</p>
          </button>
        ))}
      </div>

      {/* Source Authority Badge Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 text-[10px] text-slate-400 space-y-1 font-mono">
        <div className="flex items-center gap-1 text-slate-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Source Hierarchy Active
        </div>
        <p className="text-slate-500 text-[9px] leading-tight">
          Agreements (Tier 1) &gt; Policy v3/SOP (Tier 2) &gt; Ops (Tier 3) &gt; Tickets (Context)
        </p>
      </div>
    </aside>
  );
}
