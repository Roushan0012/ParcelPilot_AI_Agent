import { searchDocumentChunks } from "./embeddings";
import { getAccounts, getOrders, getTickets, createPendingAction, AuthContext, SNAPSHOT_TIME, SNAPSHOT_DATE } from "../data/db";
import { PendingAction, Citation } from "../types";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "search_documents",
    description:
      "Semantic search over pgvector-embedded policy chunks, SOPs, known issues, and signed enterprise agreements. Returns authoritative content, source document names, versions, effective dates, and authority levels. Customer-specific agreements override general policies.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for policy, SLA, cancellation fee, credit rules, or known issues.",
        },
        customer_scope: {
          type: "string",
          description: "Optional customer scope: 'general', 'Northstar', 'LumenWorks', 'ACCT-001', 'ACCT-002'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "query_account_data",
    description:
      "Structured lookup and calculations over ParcelPilot accounts, orders, and tickets in Postgres. Scoped by active user role and RLS permissions. Can lookup order status, calculate pickup delay relative to snapshot time (2026-08-16 11:00 Asia/Kolkata), check carrier fault, verify account plan, and fetch tickets.",
    parameters: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          enum: ["orders", "accounts", "tickets", "all_summary", "order_delay_calc"],
          description: "Optional entity type ('orders', 'accounts', 'tickets'). Will be auto-inferred if omitted.",
        },
        order_id: {
          type: "string",
          description: "Order ID (e.g. ORD-1001, ORD-2002).",
        },
        account_id: {
          type: "string",
          description: "Account ID (e.g. ACCT-001, ACCT-002, ACCT-003, ACCT-004).",
        },
        ticket_id: {
          type: "string",
          description: "Ticket ID (e.g. TKT-501, TKT-502, TKT-504).",
        },
        status: {
          type: "string",
          description: "Status filter (e.g. BOOKED, PICKED_UP, open, closed).",
        },
      },
      required: [],
    },
  },
  {
    name: "create_action",
    description:
      "Propose a state-changing action (escalation, ticket update, follow-up task, service credit claim). NOTE: THIS DOES NOT DIRECTLY EXECUTE. It generates a pending action preview card for explicit user confirmation in the UI.",
    parameters: {
      type: "object",
      properties: {
        action_type: {
          type: "string",
          enum: ["escalation", "ticket_update", "follow_up_task", "service_credit_claim"],
          description: "The type of operational action to create.",
        },
        title: {
          type: "string",
          description: "Action title (e.g. 'P1 Outage Escalation for Northstar', 'Service Credit Claim INR 1,200').",
        },
        description: {
          type: "string",
          description: "Detailed description of the proposed action.",
        },
        account_id: {
          type: "string",
          description: "Associated account ID.",
        },
        ticket_id: {
          type: "string",
          description: "Associated ticket ID if applicable.",
        },
        order_id: {
          type: "string",
          description: "Associated order ID if applicable.",
        },
        severity: {
          type: "string",
          enum: ["P1", "P2", "P3"],
          description: "Severity level for escalations.",
        },
        recommended_assignee: {
          type: "string",
          description: "Recommended team member or role (e.g. 'CSM Priya Mehta', 'On-call Engineering Lead').",
        },
        credit_amount_inr: {
          type: "number",
          description: "Credit amount in INR if applicable.",
        },
        manager_approval_required: {
          type: "boolean",
          description: "True if individual credit is above INR 1,000 as per SOP rules.",
        },
        reason: {
          type: "string",
          description: "Business justification based on authoritative policies.",
        },
        governing_source: {
          type: "string",
          description: "Citation of the governing document/clause (e.g. 'Northstar Enterprise Agreement Clause 2').",
        },
      },
      required: ["action_type", "title", "description", "reason", "governing_source"],
    },
  },
];

export async function executeTool(
  toolName: string,
  args: any,
  auth: AuthContext
): Promise<{ result: any; pendingAction?: PendingAction; citations?: Citation[] }> {
  if (toolName === "search_documents") {
    let scope = args.customer_scope;
    if (!scope && auth.accountId) {
      scope = auth.accountId;
    }
    const chunks = await searchDocumentChunks(args.query, {
      customerScope: scope,
      topK: 5,
    });

    const citations: Citation[] = chunks.map((c) => ({
      id: c.id,
      source_name: c.source_name,
      doc_title: c.doc_title,
      version: c.version,
      effective_date: c.effective_date,
      section_title: c.section_title,
      authority_level: c.authority_level,
      customer_scope: c.customer_scope,
      snippet: c.content.slice(0, 160) + "...",
    }));

    return {
      result: {
        total_found: chunks.length,
        documents: chunks.map((c) => ({
          source_name: c.source_name,
          doc_title: c.doc_title,
          version: c.version,
          status: c.status,
          effective_date: c.effective_date,
          customer_scope: c.customer_scope,
          authority_level: c.authority_level,
          is_authoritative: c.is_authoritative,
          section_title: c.section_title,
          content: c.content,
          supersedes: c.supersedes,
          superseded_by: c.superseded_by,
        })),
        note: "Customer-specific agreements (Authority Level 1) override standard policies (Level 2). Support Policy v3 overrides Deprecated v2. Historical resolutions are context only.",
      },
      citations,
    };
  }

  if (toolName === "query_account_data") {
    let { entity, order_id, account_id, ticket_id, status } = args || {};

    if (!entity) {
      if (ticket_id) entity = "tickets";
      else if (order_id) entity = "orders";
      else if (account_id) entity = "accounts";
    }

    if (entity === "orders" || order_id) {
      const orders = await getOrders(auth, { order_id, account_id, status });
      const enrichedOrders = orders.map((o) => {
        // Calculate delay relative to snapshot time
        let delayHours = 0;
        if (o.pickup_window_end) {
          const windowEnd = new Date(o.pickup_window_end.replace(" ", "T") + "+05:30");
          const diffMs = SNAPSHOT_DATE.getTime() - windowEnd.getTime();
          delayHours = Math.max(0, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
        }
        return {
          ...o,
          current_snapshot_time: SNAPSHOT_TIME,
          hours_past_window_end_at_snapshot: delayHours,
        };
      });
      return {
        result: {
          entity: "orders",
          count: enrichedOrders.length,
          data: enrichedOrders,
          snapshot_reference_time: SNAPSHOT_TIME,
        },
      };
    }

    if (entity === "accounts" || account_id) {
      const accounts = await getAccounts(auth);
      const filtered = account_id
        ? accounts.filter((a) => a.account_id.toUpperCase() === account_id.toUpperCase())
        : accounts;
      return {
        result: {
          entity: "accounts",
          count: filtered.length,
          data: filtered,
        },
      };
    }

    if (entity === "tickets" || ticket_id) {
      const tickets = await getTickets(auth, { ticket_id, account_id, status });
      return {
        result: {
          entity: "tickets",
          count: tickets.length,
          data: tickets,
          warning: "Historical resolutions should be treated as context only and may be incorrect.",
        },
      };
    }

    if (entity === "order_delay_calc" && order_id) {
      const orders = await getOrders(auth, { order_id });
      if (orders.length === 0) {
        return { result: { error: `Order ${order_id} not found or access denied.` } };
      }
      const o = orders[0];
      const windowEnd = o.pickup_window_end ? new Date(o.pickup_window_end.replace(" ", "T") + "+05:30") : null;
      const delayMs = windowEnd ? SNAPSHOT_DATE.getTime() - windowEnd.getTime() : 0;
      const delayHours = Number((delayMs / (1000 * 60 * 60)).toFixed(2));
      return {
        result: {
          order_id: o.order_id,
          account_id: o.account_id,
          carrier: o.carrier,
          status: o.status,
          carrier_fault: o.carrier_fault,
          customer_fault: o.customer_fault,
          pickup_window_end: o.pickup_window_end,
          snapshot_time: SNAPSHOT_TIME,
          hours_delayed_at_snapshot: delayHours,
          shipment_fee_inr: o.shipment_fee_inr,
          is_eligible_default_credit: delayHours > 2 && o.carrier_fault && !o.customer_fault,
          default_credit_calc: Math.min(500, o.shipment_fee_inr * 0.1),
        },
      };
    }

    // Default summary
    const [accounts, orders, tickets] = await Promise.all([
      getAccounts(auth),
      getOrders(auth),
      getTickets(auth),
    ]);
    return {
      result: {
        entity: "all_summary",
        snapshot_time: SNAPSHOT_TIME,
        total_accounts: accounts.length,
        total_orders: orders.length,
        total_tickets: tickets.length,
        accounts: accounts.map((a) => ({ id: a.account_id, name: a.account_name, plan: a.plan })),
      },
    };
  }

  if (toolName === "create_action") {
    const actionPayload = {
      account_id: args.account_id,
      ticket_id: args.ticket_id,
      order_id: args.order_id,
      title: args.title,
      description: args.description,
      severity: args.severity,
      recommended_assignee: args.recommended_assignee,
      credit_amount_inr: args.credit_amount_inr,
      manager_approval_required: args.credit_amount_inr ? args.credit_amount_inr > 1000 : false,
      reason: args.reason,
      governing_source: args.governing_source,
    };

    const pendingAction = await createPendingAction({
      action_type: args.action_type,
      payload: actionPayload,
    });

    return {
      result: {
        status: "PENDING_CONFIRMATION",
        action_id: pendingAction.action_id,
        action_type: pendingAction.action_type,
        preview: actionPayload,
        confirmation_required: true,
        message:
          "⚠️ Action created and queued for explicit user confirmation. It will not be executed until confirmed in the UI.",
      },
      pendingAction,
    };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}
