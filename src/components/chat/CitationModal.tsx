"use client";

import React from "react";
import { Citation } from "@/lib/types";
import { X, BookOpen, FileCheck, ShieldAlert, Calendar, User, ExternalLink } from "lucide-react";

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationModal({ citation, onClose }: CitationModalProps) {
  if (!citation) return null;

  const getAuthorityBadge = (level: number) => {
    if (level === 1) {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold font-mono">
          TIER 1: Signed Customer Agreement (Highest Authority)
        </span>
      );
    }
    if (level === 2) {
      return (
        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold font-mono">
          TIER 2: Current Support Policy / SOP
        </span>
      );
    }
    if (level === 3) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
          TIER 3: Product Ops Guide & Known Issues
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-mono">
        TIER 4: Deprecated Policy (Historical Only)
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{citation.doc_title}</h3>
              <p className="text-xs text-slate-400 font-mono">{citation.source_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {getAuthorityBadge(citation.authority_level)}
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
              Version: {citation.version}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Effective: {citation.effective_date}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> Scope: {citation.customer_scope}
            </span>
          </div>

          <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800/90">
            <h4 className="text-xs font-semibold text-teal-400 mb-2 font-mono uppercase tracking-wider">
              {citation.section_title}
            </h4>
            <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {citation.snippet}
            </div>
          </div>

          <div className="text-xs text-slate-400 p-3 rounded-lg bg-slate-800/40 border border-slate-800">
            <p className="font-semibold text-slate-300 mb-1">Source Authority Rule:</p>
            <p>
              Customer-specific agreements (Authority Level 1) strictly supersede general policies (Authority Level 2).
              Support Policy v3 supersedes Deprecated v2. Historical ticket guidance is non-authoritative.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
}
