"use client";

import React, { useState } from "react";
import { ToolCallEvent } from "@/lib/types";
import { ChevronDown, ChevronRight, Search, Database, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  tool: ToolCallEvent;
}

export function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getToolIcon = () => {
    switch (tool.tool_name) {
      case "search_documents":
        return <Search className="w-3.5 h-3.5 text-teal-400" />;
      case "query_account_data":
        return <Database className="w-3.5 h-3.5 text-sky-400" />;
      case "create_action":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Search className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getToolLabel = () => {
    switch (tool.tool_name) {
      case "search_documents":
        return `Searching vector documents: "${tool.args.query || ""}"`;
      case "query_account_data":
        return `Querying Postgres data: ${tool.args.entity || "records"}${tool.args.order_id ? ` [${tool.args.order_id}]` : ""}${tool.args.ticket_id ? ` [${tool.args.ticket_id}]` : ""}${tool.args.account_id ? ` [${tool.args.account_id}]` : ""}`;
      case "create_action":
        return `Prepared Action: ${tool.args.action_type || "action"} — ${tool.args.title || ""}`;
      default:
        return `Calling tool: ${tool.tool_name}`;
    }
  };

  return (
    <div className="my-1.5 rounded-lg border border-slate-700/60 bg-slate-900/80 backdrop-blur-sm text-xs font-mono overflow-hidden transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
          {getToolIcon()}
          <span className="font-semibold text-slate-300 truncate">{getToolLabel()}</span>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {tool.status === "executing" && (
            <span className="flex items-center gap-1 text-teal-400 text-[10px]">
              <Loader2 className="w-3 h-3 animate-spin" /> Running
            </span>
          )}
          {tool.status === "completed" && (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
          {tool.status === "failed" && (
            <span className="flex items-center gap-1 text-rose-400 text-[10px]">
              <XCircle className="w-3 h-3" /> Error
            </span>
          )}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 text-[11px] text-slate-300 space-y-2">
          <div>
            <div className="text-slate-500 font-semibold mb-1">Arguments:</div>
            <pre className="p-2 bg-slate-900 rounded border border-slate-800/80 overflow-x-auto text-teal-300">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>
          {tool.result && (
            <div>
              <div className="text-slate-500 font-semibold mb-1">Output Result:</div>
              <pre className="p-2 bg-slate-900 rounded border border-slate-800/80 overflow-x-auto text-slate-300 max-h-48">
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
