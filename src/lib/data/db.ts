import { Account, Order, Ticket, PendingAction, UserRole } from "@/lib/types";
import { getServiceClient, supabase } from "@/lib/supabase/client";
import dataset from "./dataset.json";

// In-memory action store initialized from database state
let actionsStore: PendingAction[] = [];

export interface AuthContext {
  role: UserRole;
  accountId?: string; // If scoped to specific account (e.g. ACCT-001)
  accountScope?: string;
}

export const SNAPSHOT_TIME = dataset.snapshot_time || "2026-08-16 11:00 Asia/Kolkata";
export const SNAPSHOT_DATE = new Date("2026-08-16T11:00:00+05:30");

/**
 * Access-Control and RLS Enforcement Layer querying live Supabase PostgreSQL tables
 * - ops_manager: Full global access across all accounts, orders, tickets
 * - support_agent: Access to all accounts/orders/tickets for investigation and action proposals
 * - customer_mock: Strictly isolated to their own account_id
 */
export async function getAccounts(auth: AuthContext): Promise<Account[]> {
  const activeAccountId = auth.accountId || auth.accountScope;

  try {
    const client = getServiceClient();
    let query = client.from("accounts").select("*");

    if (auth.role === "customer_mock") {
      if (!activeAccountId) return [];
      query = query.eq("account_id", activeAccountId);
    } else if (activeAccountId) {
      query = query.eq("account_id", activeAccountId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as Account[];
    }
  } catch (err) {
    console.warn("Supabase live accounts query fallback to dataset:", err);
  }

  // Fallback to dataset.json
  const allAccounts = dataset.accounts as Account[];
  if (auth.role === "customer_mock") {
    if (!activeAccountId) return [];
    return allAccounts.filter((a) => a.account_id === activeAccountId);
  }
  if (activeAccountId) {
    return allAccounts.filter((a) => a.account_id === activeAccountId);
  }
  return allAccounts;
}

export async function getOrders(
  auth: AuthContext,
  filters?: { order_id?: string; account_id?: string; carrier?: string; status?: string }
): Promise<Order[]> {
  const activeAccountId = auth.accountId || auth.accountScope;

  try {
    const client = getServiceClient();
    let query = client.from("orders").select("*");

    // Enforce RLS access boundary
    if (auth.role === "customer_mock") {
      if (!activeAccountId) return [];
      query = query.eq("account_id", activeAccountId);
    } else if (activeAccountId) {
      query = query.eq("account_id", activeAccountId);
    }

    if (filters?.order_id) {
      query = query.ilike("order_id", `%${filters.order_id.trim()}%`);
    }
    if (filters?.account_id) {
      query = query.eq("account_id", filters.account_id.trim());
    }
    if (filters?.carrier) {
      query = query.ilike("carrier", `%${filters.carrier.trim()}%`);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status.trim());
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as Order[];
    }
  } catch (err) {
    console.warn("Supabase live orders query fallback to dataset:", err);
  }

  // Fallback to dataset.json
  let allOrders = dataset.orders as Order[];
  if (auth.role === "customer_mock") {
    if (!activeAccountId) return [];
    allOrders = allOrders.filter((o) => o.account_id === activeAccountId);
  } else if (activeAccountId) {
    allOrders = allOrders.filter((o) => o.account_id === activeAccountId);
  }

  if (filters?.order_id) {
    const q = filters.order_id.trim().toUpperCase();
    allOrders = allOrders.filter((o) => o.order_id.toUpperCase() === q || o.order_id.toUpperCase().includes(q));
  }
  if (filters?.account_id) {
    const q = filters.account_id.trim().toUpperCase();
    allOrders = allOrders.filter((o) => o.account_id.toUpperCase() === q);
  }
  if (filters?.carrier) {
    const q = filters.carrier.trim().toLowerCase();
    allOrders = allOrders.filter((o) => o.carrier.toLowerCase().includes(q));
  }
  if (filters?.status) {
    const q = filters.status.trim().toUpperCase();
    allOrders = allOrders.filter((o) => o.status.toUpperCase() === q);
  }

  return allOrders;
}

export async function getTickets(
  auth: AuthContext,
  filters?: { ticket_id?: string; account_id?: string; status?: string; search?: string }
): Promise<Ticket[]> {
  const activeAccountId = auth.accountId || auth.accountScope;

  try {
    const client = getServiceClient();
    let query = client.from("tickets").select("*");

    // Enforce RLS access boundary
    if (auth.role === "customer_mock") {
      if (!activeAccountId) return [];
      query = query.eq("account_id", activeAccountId);
    } else if (activeAccountId) {
      query = query.eq("account_id", activeAccountId);
    }

    if (filters?.ticket_id) {
      query = query.ilike("ticket_id", `%${filters.ticket_id.trim()}%`);
    }
    if (filters?.account_id) {
      query = query.eq("account_id", filters.account_id.trim());
    }
    if (filters?.status) {
      query = query.eq("status", filters.status.trim());
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as Ticket[];
    }
  } catch (err) {
    console.warn("Supabase live tickets query fallback to dataset:", err);
  }

  // Fallback to dataset.json
  let allTickets = dataset.tickets as Ticket[];
  if (auth.role === "customer_mock") {
    if (!activeAccountId) return [];
    allTickets = allTickets.filter((t) => t.account_id === activeAccountId);
  } else if (activeAccountId) {
    allTickets = allTickets.filter((t) => t.account_id === activeAccountId);
  }

  if (filters?.ticket_id) {
    const q = filters.ticket_id.trim().toUpperCase();
    allTickets = allTickets.filter((t) => t.ticket_id.toUpperCase() === q || t.ticket_id.toUpperCase().includes(q));
  }
  if (filters?.account_id) {
    const q = filters.account_id.trim().toUpperCase();
    allTickets = allTickets.filter((t) => t.account_id.toUpperCase() === q);
  }
  if (filters?.status) {
    const q = filters.status.trim().toLowerCase();
    allTickets = allTickets.filter((t) => t.status.toLowerCase() === q);
  }
  if (filters?.search) {
    const q = filters.search.trim().toLowerCase();
    allTickets = allTickets.filter(
      (t) => t.subject.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }

  return allTickets;
}

export async function createPendingAction(
  action_type_or_obj: any,
  payload_arg?: any
): Promise<PendingAction> {
  const action_type = typeof action_type_or_obj === "object" ? action_type_or_obj.action_type : action_type_or_obj;
  const payload = typeof action_type_or_obj === "object" ? action_type_or_obj.payload : payload_arg;

  const action: PendingAction = {
    action_id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action_type,
    status: "PENDING_CONFIRMATION",
    payload,
    created_at: new Date().toISOString(),
  };

  actionsStore.unshift(action);

  // Also persist to Supabase actions table
  try {
    const client = getServiceClient();
    await client.from("actions").insert({
      action_type,
      payload,
      status: "PENDING_CONFIRMATION",
      account_id: payload.account_id || null,
      ticket_id: payload.ticket_id || null,
      order_id: payload.order_id || null,
    });
  } catch (err) {
    console.warn("Could not insert action into Supabase actions table:", err);
  }

  return action;
}

export async function confirmAction(actionId: string, confirmed: boolean = true): Promise<{ success: boolean; message: string; action?: PendingAction }> {
  const action = actionsStore.find((a) => a.action_id === actionId);
  if (!action) {
    return { success: false, message: `Action ${actionId} not found in pending state.` };
  }

  action.status = confirmed ? "EXECUTED" : "CANCELLED";
  action.confirmed_at = new Date().toISOString();

  // Also update Supabase actions table
  try {
    const client = getServiceClient();
    await client
      .from("actions")
      .update({ status: action.status, confirmed_at: action.confirmed_at })
      .match({ action_id: actionId });
  } catch (err) {
    console.warn("Could not update action in Supabase:", err);
  }

  return {
    success: true,
    message: confirmed
      ? `✅ Action ${actionId} (${action.action_type}) confirmed and executed successfully.`
      : `❌ Action ${actionId} was rejected and dismissed.`,
    action,
  };
}

export async function cancelAction(actionId: string): Promise<{ success: boolean; message: string; action?: PendingAction }> {
  return confirmAction(actionId, false);
}

export async function getActions(): Promise<PendingAction[]> {
  try {
    const client = getServiceClient();
    const { data, error } = await client.from("actions").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        action_id: d.action_id || `ACT-${d.id}`,
        action_type: d.action_type,
        status: d.status,
        payload: d.payload,
        created_at: d.created_at,
        confirmed_at: d.confirmed_at,
      }));
    }
  } catch (err) {
    console.warn("Fallback to local actionsStore:", err);
  }

  return actionsStore;
}

// In-memory evaluation and observability logs store
let evalLogsStore: any[] = [];

/**
 * Computes estimated cost in USD based on model token rates
 */
export function computeEstimatedCost(model: string, inputTokens: number, outputTokens: number): number {
  const m = (model || "").toLowerCase();
  let inRate = 0.59 / 1_000_000; // default Groq GPT-OSS rate
  let outRate = 0.79 / 1_000_000;

  if (m.includes("claude-3-5-sonnet") || m.includes("sonnet")) {
    inRate = 3.00 / 1_000_000;
    outRate = 15.00 / 1_000_000;
  } else if (m.includes("llama-3") || m.includes("70b") || m.includes("20b")) {
    inRate = 0.59 / 1_000_000;
    outRate = 0.79 / 1_000_000;
  }

  const cost = (inputTokens * inRate) + (outputTokens * outRate);
  return Math.round(cost * 1000000) / 1000000; // Round to 6 decimals
}

/**
 * Records an evaluation log event (fire-and-forget, non-blocking)
 */
export async function createEvalLog(logData: {
  query: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  tools_called: string[];
  model: string;
  status: "success" | "error";
  error_message?: string | null;
  role: string;
  account_id?: string | null;
}) {
  const total_tokens = logData.input_tokens + logData.output_tokens;
  const estimated_cost_usd = computeEstimatedCost(logData.model, logData.input_tokens, logData.output_tokens);

  const evalLog = {
    id: `EVAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    query: logData.query,
    latency_ms: Math.round(logData.latency_ms),
    input_tokens: logData.input_tokens,
    output_tokens: logData.output_tokens,
    total_tokens,
    tools_called: logData.tools_called,
    tool_count: logData.tools_called.length,
    model: logData.model,
    estimated_cost_usd,
    status: logData.status,
    error_message: logData.error_message || null,
    role: logData.role,
    account_id: logData.account_id || null,
  };

  evalLogsStore.unshift(evalLog);
  if (evalLogsStore.length > 200) {
    evalLogsStore = evalLogsStore.slice(0, 200);
  }

  // Attempt background insertion into Supabase eval_logs table
  try {
    const client = getServiceClient();
    client.from("eval_logs").insert([evalLog]).then(({ error }) => {
      if (error) {
        // Silent background fallback
      }
    });
  } catch (err) {
    // Silent fail
  }

  return evalLog;
}

/**
 * Fetches aggregated performance metrics and recent interaction logs
 */
export async function getEvalMetrics(auth: AuthContext, limit: number = 25) {
  let logs = [...evalLogsStore];

  try {
    const client = getServiceClient();
    const { data, error } = await client
      .from("eval_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      logs = data;
    }
  } catch (err) {
    // Fallback to local memory logs
  }

  const recent20 = logs.slice(0, 20);
  const avg_latency_ms = recent20.length > 0
    ? Math.round(recent20.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / recent20.length)
    : 0;

  const total_tokens = logs.reduce((acc, l) => acc + (l.total_tokens || 0), 0);
  const session_tokens = logs.slice(0, 10).reduce((acc, l) => acc + (l.total_tokens || 0), 0);
  const total_cost_usd = Math.round(logs.reduce((acc, l) => acc + (l.estimated_cost_usd || 0), 0) * 10000) / 10000;
  const total_queries = logs.length;
  const errorCount = logs.filter((l) => l.status === "error").length;
  const error_rate_pct = total_queries > 0 ? Math.round((errorCount / total_queries) * 100) : 0;

  return {
    avg_latency_ms,
    total_tokens,
    session_tokens,
    total_cost_usd,
    total_queries,
    error_rate_pct,
    logs: logs.slice(0, limit),
  };
}

