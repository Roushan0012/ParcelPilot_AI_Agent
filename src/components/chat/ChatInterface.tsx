"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, ToolCallEvent, Citation, PendingAction, UserRole } from "@/lib/types";
import { ToolCallBadge } from "./ToolCallBadge";
import { ActionConfirmationCard } from "./ActionConfirmationCard";
import { CitationModal } from "./CitationModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  CheckCircle2,
  Mic,
  Square,
  AlertCircle,
  X
} from "lucide-react";

interface ChatInterfaceProps {
  role: UserRole;
  accountScope: string;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

type VoiceState = "idle" | "recording" | "transcribing";

export function ChatInterface({ role, accountScope, initialPrompt, onClearInitialPrompt }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content: `👋 **Welcome to ParcelPilot Operations Copilot**\n\nI can assist you with:\n- **Contractual terms & policy verification** (Northstar fee waivers, LumenWorks custom credits)\n- **Order tracking & delay calculations** relative to snapshot anchor (**2026-08-16 11:00 IST**)\n- **SLA compliance monitoring & critical incident escalation**\n- **Confirmation-gated operational actions** (service credits, ticket updates)\n\nType your query, click a prompt from the sidebar, or use the **microphone button** to speak your inquiry.`,
      created_at: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  
  // Voice Input (Whisper STT) States
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt]);

  // Clean up recording timer and stream on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

  // Start Audio Recording via MediaRecorder
  const startRecording = async () => {
    setVoiceError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError("Voice input is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported mimeType
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (audioBlob.size < 100) {
          setVoiceState("idle");
          setVoiceError("Didn't catch that — try again.");
          return;
        }

        await processTranscription(audioBlob);
      };

      mediaRecorder.start(250);
      setVoiceState("recording");
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            // Auto-stop after 60 seconds of recording
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setVoiceError("Microphone access is blocked — enable it in your browser settings to use voice input.");
      } else {
        setVoiceError("Voice input is unavailable right now — you can type instead.");
      }
      setVoiceState("idle");
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setVoiceState("transcribing");
      mediaRecorderRef.current.stop();
    }
  };

  // Send audio to /api/transcribe
  const processTranscription = async (blob: Blob) => {
    setVoiceState("transcribing");
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.text && data.text.trim().length > 0) {
        const transcribedText = data.text.trim();
        setInput((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
        setVoiceError(null);
      } else if (res.ok && (!data.text || data.text.trim().length === 0)) {
        setVoiceError("Didn't catch that — try again.");
      } else {
        console.error("Transcription failure:", data.error);
        setVoiceError("Voice input is unavailable right now — you can type instead.");
      }
    } catch (err: any) {
      console.error("Transcription network error:", err);
      setVoiceError("Voice input is unavailable right now — you can type instead.");
    } finally {
      setVoiceState("idle");
    }
  };

  const toggleVoiceRecording = () => {
    if (voiceState === "recording") {
      stopRecording();
    } else if (voiceState === "idle") {
      startRecording();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
                <div className="max-w-2xl bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md text-xs sm:text-sm leading-relaxed font-medium">
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

                  {/* Main Response Markdown Card */}
                  <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl rounded-tl-sm p-4 sm:p-5 text-xs sm:text-sm text-slate-200 shadow-xl leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => <h1 className="text-base font-bold text-slate-100 mt-3 mb-2 border-b border-slate-800 pb-1" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-teal-400 mt-3 mb-1.5" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-xs font-semibold text-sky-300 mt-2 mb-1 uppercase tracking-wider font-mono" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-slate-300" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-slate-300" {...props} />,
                        li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-2 border-teal-500/60 pl-3 my-2 text-slate-300 italic bg-slate-950/50 py-1 rounded-r" {...props} />
                        ),
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 rounded-lg border border-slate-800 bg-slate-950/70">
                            <table className="min-w-full text-xs divide-y divide-slate-800" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => <thead className="bg-slate-900/80 font-mono text-slate-400 text-[11px]" {...props} />,
                        th: ({ node, ...props }) => <th className="px-3 py-2 text-left font-semibold" {...props} />,
                        td: ({ node, ...props }) => <td className="px-3 py-2 whitespace-nowrap text-slate-300 border-t border-slate-850" {...props} />,
                        code: ({ node, className, children, ...props }: any) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="px-1.5 py-0.5 rounded bg-slate-950 text-teal-300 font-mono text-[11px] border border-slate-800" {...props}>
                              {children}
                            </code>
                          ) : (
                            <pre className="p-3 rounded-lg bg-slate-950 overflow-x-auto text-xs text-teal-300 font-mono border border-slate-800 my-2">
                              <code {...props}>{children}</code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
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
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md relative">
        {/* Inline Voice Error Message Banner */}
        {voiceError && (
          <div className="max-w-4xl mx-auto mb-2.5 px-3.5 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              onClick={() => setVoiceError(null)}
              className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-900/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          {/* Main Input Text Field */}
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || voiceState === "recording"}
              placeholder={
                voiceState === "recording"
                  ? "🎙️ Listening... Speak your operational inquiry now."
                  : voiceState === "transcribing"
                  ? "⚡ Transcribing audio via Whisper STT..."
                  : "Ask about policies, order cancellation fees, SLA response targets, service credits, or escalations..."
              }
              className={`w-full bg-slate-900/90 border rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-sans ${
                voiceState === "recording"
                  ? "border-teal-500/80 ring-2 ring-teal-500/20 bg-slate-900 text-teal-200 placeholder:text-teal-400/70"
                  : voiceState === "transcribing"
                  ? "border-sky-500/50 bg-slate-900/70 text-slate-300"
                  : "border-slate-700/80 focus:border-teal-500"
              }`}
            />

            {/* Live Recording Badge with Pulsing Timer */}
            {voiceState === "recording" && (
              <div className="absolute right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-950/90 border border-teal-500/50 text-[11px] font-mono text-teal-300 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span>REC {formatTimer(recordSeconds)}</span>
              </div>
            )}
          </div>

          {/* Microphone Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            disabled={loading || voiceState === "transcribing"}
            title={
              voiceState === "recording"
                ? "Click to stop recording and transcribe"
                : voiceState === "transcribing"
                ? "Transcribing voice input..."
                : "Record voice input (Whisper STT)"
            }
            className={`p-3 rounded-xl border transition-all flex items-center justify-center flex-shrink-0 ${
              voiceState === "recording"
                ? "bg-teal-500 text-slate-950 border-teal-400 font-bold shadow-lg shadow-teal-500/30 scale-105"
                : voiceState === "transcribing"
                ? "bg-slate-800 text-teal-400 border-teal-500/30 opacity-80 cursor-wait"
                : "bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-400 hover:text-teal-300 hover:border-slate-600"
            }`}
          >
            {voiceState === "recording" ? (
              <Square className="w-5 h-5 fill-current" />
            ) : voiceState === "transcribing" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Send / Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading || voiceState === "recording"}
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
