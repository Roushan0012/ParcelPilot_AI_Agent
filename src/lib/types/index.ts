export type UserRole = "ops_manager" | "support_agent" | "customer_mock";

export interface Account {
  account_id: string;
  account_name: string;
  plan: "Enterprise" | "Growth" | "Standard";
  status: "active" | "suspended" | "inactive";
  csm?: string | null;
  contract_file?: string | null;
  premium_support: boolean;
  notes?: string | null;
}

export interface Order {
  order_id: string;
  account_id: string;
  carrier: string;
  status: "BOOKED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  booked_at: string;
  pickup_window_start?: string | null;
  pickup_window_end?: string | null;
  pickup_actual_at?: string | null;
  shipment_fee_inr: number;
  carrier_fault: boolean;
  customer_fault: boolean;
  cancellation_requested_at?: string | null;
  notes?: string | null;
}

export interface Ticket {
  ticket_id: string;
  account_id: string;
  created_at: string;
  status: "open" | "pending" | "resolved" | "closed";
  subject: string;
  description: string;
  channel: "chat" | "email" | "phone";
  assigned_to?: string | null;
  last_customer_message_at?: string | null;
  historical_resolution?: string | null;
}

export interface DocumentChunk {
  id: string;
  source_name: string;
  doc_title: string;
  version: string;
  status: string;
  effective_date: string;
  customer_scope: string; // 'general' | 'Northstar' | 'LumenWorks'
  account_id?: string | null;
  authority_level: number; // 1 (Highest: Signed Agreement), 2 (Current Policy/SOP), 3 (Ops Guide), 99 (Deprecated)
  is_authoritative: boolean;
  supersedes?: string | null;
  superseded_by?: string | null;
  section_title: string;
  content: string;
  embedding?: number[];
  similarity?: number;
}

export interface PendingAction {
  action_id: string;
  action_type: "escalation" | "ticket_update" | "follow_up_task" | "service_credit_claim";
  status: "PENDING_CONFIRMATION" | "EXECUTED" | "CANCELLED";
  payload: {
    account_id?: string;
    ticket_id?: string;
    order_id?: string;
    title: string;
    description: string;
    severity?: "P1" | "P2" | "P3";
    recommended_assignee?: string;
    credit_amount_inr?: number;
    manager_approval_required?: boolean;
    reason: string;
    governing_source: string;
  };
  created_at: string;
  confirmed_at?: string | null;
}

export interface ToolCallEvent {
  tool_id: string;
  tool_name: string;
  args: Record<string, any>;
  result?: any;
  status: "executing" | "completed" | "failed";
  timestamp: string;
}

export interface Citation {
  id: string;
  source_name: string;
  doc_title: string;
  version: string;
  effective_date: string;
  section_title: string;
  authority_level: number;
  customer_scope: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCallEvent[];
  pendingAction?: PendingAction | null;
  citations?: Citation[];
  created_at: string;
}

export interface ProactiveAlert {
  id: string;
  type: "sla_breach" | "carrier_fault_credit" | "known_issue_correlation" | "security_incident" | "historical_resolution_conflict";
  severity: "critical" | "high" | "medium" | "info";
  title: string;
  summary: string;
  affected_entity: {
    account_id?: string;
    account_name?: string;
    ticket_id?: string;
    order_id?: string;
  };
  details: string;
  actionable_recommendation: string;
  proposed_action?: PendingAction;
  source_citation: string;
}

export interface AgentRunResult {
  message: string;
  toolCalls: ToolCallEvent[];
  pendingAction: PendingAction | null;
  citations: Citation[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

export interface EvalLog {
  id: string;
  timestamp: string;
  query: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  tools_called: string[];
  tool_count: number;
  model: string;
  estimated_cost_usd: number;
  status: "success" | "error";
  error_message?: string | null;
  role: string;
  account_id?: string | null;
}

export interface EvalMetricsSummary {
  avg_latency_ms: number;
  total_tokens: number;
  session_tokens: number;
  total_cost_usd: number;
  total_queries: number;
  error_rate_pct: number;
  logs: EvalLog[];
}

