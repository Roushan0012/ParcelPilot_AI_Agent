"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, ToolCallEvent, Citation, PendingAction, UserRole } from "@/lib/types";
import { ToolCallBadge } from "./ToolCallBadge";
import { ActionConfirmationCard } from "./ActionConfirmationCard";
import { CitationModal } from "./CitationModal";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Trash2, 
  BookOpen, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  Database,
  Search,
  CheckCircle2
} from "lucide-react";

interface ChatInterfaceProps {
  role: UserRole;
  accountScope: string;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export function ChatInterface({ role, accountScope, initialPrompt, onClearInitialPrompt }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content: `👋 Hello! I am the **ParcelPilot Internal Operations & Support AI Agent**.\n\nI can help you look up operational records in Postgres, review signed enterprise agreements, calculate service credit entitlements relative to our system snapshot time (**2026-08-16 11:00 IST**), and prepare confirmation-gated escalation actions.\n\nHow can I assist your operations today?`,
      created_at: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      created_at: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          role,
          accountId: accountScope || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **Operational Reasoning Error:** ${data.error}`,
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: data.message,
          toolCalls: data.toolCalls || [],
          pendingAction: data.pendingAction || null,
          citations: data.citations || [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Network / System Error:** ${err.message}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        content: `👋 Session reset. Ready for new operations inquiry under active role: **${role}** ${accountScope ? `(Scoped: ${accountScope})` : ""}.`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top Header Bar */}
      <header className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Operations & Policy Copilot
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                ONLINE
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Active Context: <span className="text-slate-200 font-medium">{role}</span>
              {accountScope && (
                <span className="text-teal-400 ml-1 font-mono">[{accountScope}]</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          title="Clear Conversation"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Session</span>
        </button>
      </header>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((m) => (
          <div key={m.id} className="max-w-4xl mx-auto space-y-2">
            {/* User Message */}
            {m.role === "user" && (
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-2xl bg-teal-600/90 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md text-xs sm:text-sm leading-relaxed">
                  {m.content}
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Assistant Message */}
            {m.role === "assistant" && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-slate-950 flex-shrink-0 shadow-md font-bold text-xs">
                  <Bot className="w-4 h-4" />
                </div>

                <div className="flex-1 space-y-2 max-w-3xl">
                  {/* Tool Call Activity Events (Monospace badges) */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                        System Reasoning & Tool Calls:
                      </div>
                      {m.toolCalls.map((tc, idx) => (
                        <ToolCallBadge key={idx} tool={tc} />
                      ))}
                    </div>
                  )}

                  {/* Main Response Text Card */}
                  <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl rounded-tl-sm p-4 sm:p-5 text-xs sm:text-sm text-slate-200 shadow-xl leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>

                  {/* Pending Confirmation Action Card (State Changing Gate) */}
                  {m.pendingAction && (
                    <ActionConfirmationCard action={m.pendingAction} />
                  )}

                  {/* Inline Source Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-teal-400" /> Governing Source Citations:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.citations.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCitation(c)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all hover:scale-[1.02] ${
                              c.authority_level === 1
                                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60"
                                : c.authority_level === 2
                                ? "bg-sky-950/40 border-sky-500/40 text-sky-300 hover:bg-sky-900/60"
                                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span>
                              {c.authority_level === 1 ? "📜 [Tier 1 Contract]" : c.authority_level === 2 ? "📋 [Tier 2 SOP/Policy]" : "📖 [Tier 3 Guide]"}
                            </span>
                            <span className="font-semibold">{c.source_name.replace(".pdf", "")}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 flex-shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3 text-xs text-teal-400 font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Multi-step reasoning across Postgres data & vector documents...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask about policies, order cancellation fees, SLA response targets, service credits, or escalations..."
            className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all disabled:opacity-40 disabled:hover:bg-teal-500 shadow-lg shadow-teal-500/20 flex-shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {/* Document Chunk / Citation Modal */}
      <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
    </div>
  );
}
