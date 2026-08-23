"use client";

import React, { useState, useEffect } from "react";
import { UserRole } from "@/lib/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ProactiveDashboard } from "@/components/proactive/ProactiveDashboard";
import { KnowledgeExplorer } from "@/components/knowledge/KnowledgeExplorer";
import { ActionsAuditLog } from "@/components/actions/ActionsAuditLog";
import { EvaluationDashboard } from "@/components/eval/EvaluationDashboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "proactive" | "knowledge" | "actions" | "eval">("chat");
  const [role, setRole] = useState<UserRole>("ops_manager");
  const [accountScope, setAccountScope] = useState<string>("");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [criticalCount, setCriticalCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/proactive")
      .then((res) => res.json())
      .then((d) => setCriticalCount(d.critical_count || 0))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        setRole={setRole}
        accountScope={accountScope}
        setAccountScope={setAccountScope}
        onSelectPrompt={(p) => setInitialPrompt(p)}
        criticalAlertCount={criticalCount}
      />

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {activeTab === "chat" && (
          <ChatInterface
            role={role}
            accountScope={accountScope}
            initialPrompt={initialPrompt}
            onClearInitialPrompt={() => setInitialPrompt("")}
          />
        )}

        {activeTab === "proactive" && <ProactiveDashboard />}

        {activeTab === "knowledge" && <KnowledgeExplorer />}

        {activeTab === "actions" && <ActionsAuditLog />}

        {activeTab === "eval" && <EvaluationDashboard role={role} />}
      </div>
    </main>
  );
}
