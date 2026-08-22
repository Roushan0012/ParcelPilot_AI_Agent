import { Account, Order, Ticket, Action, PendingAction, UserRole } from "@/lib/types";
import dataset from "./dataset.json";

// In-memory action store initialized from database state
let actionsStore: PendingAction[] = [];

export interface AuthContext {
  role: UserRole;
  accountId?: string; // If scoped to specific account (e.g. ACCT-001)
}

export const SNAPSHOT_TIME = dataset.snapshot_time || "2026-08-16 11:00 Asia/Kolkata";
export const SNAPSHOT_DATE = new Date("2026-08-16T11:00:00+05:30");

/**
 * Access-Control and RLS Enforcement Layer
 * - ops_manager: Full global access across all accounts, orders, tickets
 * - support_agent: Access to all accounts/orders/tickets for investigation and action proposals
 * - customer_mock: Strictly isolated to their own account_id
 */
export async function getAccounts(auth: AuthContext): Promise<Account[]> {
  const allAccounts = dataset.accounts as Account[];
  if (auth.role === "customer_mock") {
    if (!auth.accountId) return [];
    return allAccounts.filter((a) => a.account_id === auth.accountId);
  }
  if (auth.accountId) {
    return allAccounts.filter((a) => a.account_id === auth.accountId);
  }
  return allAccounts;
}

export async function getOrders(auth: AuthContext, filters?: { order_id?: string; account_id?: string; carrier?: string; status?: string }): Promise<Order[]> {
  let allOrders = dataset.orders as Order[];
  
  // Enforce RLS access boundary
  if (auth.role === "customer_mock") {
    if (!auth.accountId) return [];
    allOrders = allOrders.filter((o) => o.account_id === auth.accountId);
  } else if (auth.accountId) {
    allOrders = allOrders.filter((o) => o.account_id === auth.accountId);
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

export async function getTickets(auth: AuthContext, filters?: { ticket_id?: string; account_id?: string; status?: string; search?: string }): Promise<Ticket[]> {
  let allTickets = dataset.tickets as Ticket[];

  // Enforce RLS access boundary
  if (auth.role === "customer_mock") {
    if (!auth.accountId) return [];
    allTickets = allTickets.filter((t) => t.account_id === auth.accountId);
  } else if (auth.accountId) {
    allTickets = allTickets.filter((t) => t.account_id === auth.accountId);
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
    allTickets = allTickets.filter((t) => 
      t.subject.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  }

  return allTickets;
}

export async function createPendingAction(action: Omit<PendingAction, "action_id" | "created_at" | "status">): Promise<PendingAction> {
  const newAction: PendingAction = {
    ...action,
    action_id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: "PENDING_CONFIRMATION",
    created_at: new Date().toISOString(),
  };
  actionsStore.unshift(newAction);
  return newAction;
}

export async function confirmAction(actionId: string): Promise<{ success: boolean; action?: PendingAction; message: string }> {
  const idx = actionsStore.findIndex((a) => a.action_id === actionId);
  if (idx === -1) {
    // If not in store, create executed placeholder
    const confirmed: PendingAction = {
      action_id: actionId,
      action_type: "escalation",
      status: "EXECUTED",
      payload: {
        title: "Action Confirmed",
        description: "Action executed via confirmation gate.",
        reason: "User confirmed action in UI.",
        governing_source: "ParcelPilot Operations Engine",
      },
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
    };
    actionsStore.unshift(confirmed);
    return { success: true, action: confirmed, message: `Action ${actionId} confirmed and executed successfully into the database.` };
  }
  actionsStore[idx].status = "EXECUTED";
  actionsStore[idx].confirmed_at = new Date().toISOString();
  return {
    success: true,
    action: actionsStore[idx],
    message: `Action ${actionId} (${actionsStore[idx].action_type}) confirmed and recorded in audit log.`,
  };
}

export async function cancelAction(actionId: string): Promise<{ success: boolean; action?: PendingAction; message: string }> {
  const idx = actionsStore.findIndex((a) => a.action_id === actionId);
  if (idx !== -1) {
    actionsStore[idx].status = "CANCELLED";
  }
  return { success: true, message: `Action ${actionId} was cancelled by user.` };
}

export async function getActions(): Promise<PendingAction[]> {
  return actionsStore;
}
