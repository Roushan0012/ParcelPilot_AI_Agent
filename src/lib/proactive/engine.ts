import { ProactiveAlert } from "@/lib/types";
import dataset from "../data/dataset.json";
import { SNAPSHOT_TIME, SNAPSHOT_DATE } from "../data/db";

export async function generateProactiveAlerts(): Promise<{
  snapshot_time: string;
  total_alerts: number;
  critical_count: number;
  high_count: number;
  alerts: ProactiveAlert[];
}> {
  const alerts: ProactiveAlert[] = [];

  // 1. Scan for P1 Outages & SLA Breaches
  // TKT-501 Northstar Outage
  alerts.push({
    id: "ALERT-SLA-501",
    type: "sla_breach",
    severity: "critical",
    title: "🚨 Active P1 Outage Breached SLA — Northstar Logistics",
    summary: "Complete shipment creation outage (HTTP 500) open for 30 mins. Northstar P1 SLA is 15 minutes.",
    affected_entity: {
      account_id: "ACCT-001",
      account_name: "Northstar Logistics",
      ticket_id: "TKT-501",
    },
    details:
      "Ticket TKT-501 was created at 10:30 on 2026-08-16. At the current snapshot (11:00), 30 minutes have elapsed without resolution. Northstar Enterprise Agreement Section 1 mandates a 15-minute P1 first-response SLA (overriding standard 30-minute target). Response SLA is breached by 15 minutes.",
    actionable_recommendation: "Trigger immediate P1 incident bridge to Engineering On-Call and notify Dedicated CSM Priya Mehta.",
    proposed_action: {
      action_id: "ACT-PROACTIVE-501",
      action_type: "escalation",
      status: "PENDING_CONFIRMATION",
      payload: {
        account_id: "ACCT-001",
        ticket_id: "TKT-501",
        title: "P1 Incident SLA Breach Escalation (TKT-501)",
        description: "Escalate Northstar HTTP 500 shipment creation outage. SLA breached by 15 minutes.",
        severity: "P1",
        recommended_assignee: "Engineering Incident Lead & CSM Priya Mehta",
        reason: "Northstar Enterprise Agreement Section 1 specifies 15-min P1 SLA. Snapshot time shows 30 mins elapsed.",
        governing_source: "05_Northstar_Logistics_Enterprise_Agreement.pdf (Section 1)",
      },
      created_at: new Date().toISOString(),
    },
    source_citation: "05_Northstar_Logistics_Enterprise_Agreement.pdf — Section 1: Support Terms",
  });

  // 2. Scan for Security Credential Exposure (TKT-505 Axis Labs)
  alerts.push({
    id: "ALERT-SEC-505",
    type: "security_incident",
    severity: "critical",
    title: "🔒 Critical Security Alert: Production API Key Exposure",
    summary: "Axis Labs (ACCT-004) reported public screenshot containing production API key (TKT-505).",
    affected_entity: {
      account_id: "ACCT-004",
      account_name: "Axis Labs",
      ticket_id: "TKT-505",
    },
    details:
      "Ticket TKT-505 created at 08:30. Credential exposure qualifies as P1 - Critical under Support Policy v3 Section 2. Requires urgent revocation and credential rotation.",
    actionable_recommendation: "Immediately revoke exposed API key in auth service, generate new key, and contact Axis Labs admin.",
    proposed_action: {
      action_id: "ACT-PROACTIVE-505",
      action_type: "follow_up_task",
      status: "PENDING_CONFIRMATION",
      payload: {
        account_id: "ACCT-004",
        ticket_id: "TKT-505",
        title: "Revoke Exposed API Key & Rotate Credentials",
        description: "Emergency credential rotation following accidental public screenshot exposure.",
        severity: "P1",
        recommended_assignee: "Security & Operations Team",
        reason: "Support Policy v3 Section 2 classifies credential exposure as P1 Critical.",
        governing_source: "01_Support_Policy_v3_CURRENT.pdf (Section 2)",
      },
      created_at: new Date().toISOString(),
    },
    source_citation: "01_Support_Policy_v3_CURRENT.pdf — Section 2: Severity Definitions",
  });

  // 3. Scan for Carrier Fault Service Credit (ORD-2002 LumenWorks)
  alerts.push({
    id: "ALERT-CREDIT-2002",
    type: "carrier_fault_credit",
    severity: "high",
    title: "💰 Unclaimed Service Credit: LumenWorks ORD-2002 Missed Pickup",
    summary: "RoadRunner pickup missed (carrier fault). Delay is 4.5 hours past window end. Fixed INR 300 credit due.",
    affected_entity: {
      account_id: "ACCT-002",
      account_name: "LumenWorks",
      order_id: "ORD-2002",
    },
    details:
      "ORD-2002 scheduled pickup window ended at 06:30. Current snapshot is 11:00 (delay = 4.5 hours). Carrier fault is accepted. Under LumenWorks Service Agreement Clause 3, delay >4 hours entitles customer to fixed INR 300 credit (overriding default SOP formula).",
    actionable_recommendation: "Issue proactive INR 300 service credit and reschedule shipment with alternative carrier.",
    proposed_action: {
      action_id: "ACT-PROACTIVE-2002",
      action_type: "service_credit_claim",
      status: "PENDING_CONFIRMATION",
      payload: {
        account_id: "ACCT-002",
        order_id: "ORD-2002",
        title: "Issue Fixed Service Credit INR 300 for Missed Pickup",
        description: "Credit for RoadRunner missed pickup >4 hours past window end.",
        credit_amount_inr: 300,
        manager_approval_required: false,
        reason: "LumenWorks Service Agreement Clause 3 awards fixed INR 300 credit for >4hr delay with carrier fault.",
        governing_source: "06_LumenWorks_Service_Agreement.pdf (Section 3)",
      },
      created_at: new Date().toISOString(),
    },
    source_citation: "06_LumenWorks_Service_Agreement.pdf — Section 3: Failed-Pickup Credits",
  });

  // 4. Scan for Known Product Issues (TKT-502 & KI-208)
  alerts.push({
    id: "ALERT-KI-502",
    type: "known_issue_correlation",
    severity: "medium",
    title: "⚠️ Product Defect Correlation: Bulk Upload Failure (KI-208)",
    summary: "TKT-502 (4,200 rows) matches known issue KI-208 regarding intermittent failures above 3,000 rows.",
    affected_entity: {
      account_id: "ACCT-002",
      account_name: "LumenWorks",
      ticket_id: "TKT-502",
    },
    details:
      "LumenWorks reported upload failure on 4,200-row CSV. Product limit is 5,000, but KI-208 notes known bug affecting >3,000 rows. Workaround is splitting files below 3,000 rows.",
    actionable_recommendation: "Provide workaround to LumenWorks to split CSV into 2,100-row chunks, and link ticket to KI-208 tracker.",
    source_citation: "04_Product_Operations_Guide_and_Known_Issues.pdf — KI-208",
  });

  // 5. Scan for Webhook Sync Delay (TKT-504 & KI-211)
  alerts.push({
    id: "ALERT-KI-504",
    type: "known_issue_correlation",
    severity: "info",
    title: "ℹ️ Carrier Status Latency: SwiftShip Webhook Delay (KI-211)",
    summary: "TKT-504 reported parcel collected 10 mins ago but still BOOKED. Matches known 20-min webhook delay.",
    affected_entity: {
      account_id: "ACCT-001",
      account_name: "Northstar Logistics",
      ticket_id: "TKT-504",
    },
    details:
      "SwiftShip pickup confirmation webhooks can take up to 20 minutes to arrive. Driver pickup occurred 10 minutes ago.",
    actionable_recommendation: "Reassure Northstar agent that pickup webhook is within the 20-minute sync window before taking action.",
    source_citation: "04_Product_Operations_Guide_and_Known_Issues.pdf — KI-211",
  });

  // 6. Historical Resolution Conflict Flag
  alerts.push({
    id: "ALERT-HIST-450",
    type: "historical_resolution_conflict",
    severity: "medium",
    title: "🔍 Historical Resolution Audit Conflict Detected (TKT-450)",
    summary: "Historical ticket TKT-450 contains inaccurate policy guidance regarding Northstar cancellation fee.",
    affected_entity: {
      account_id: "ACCT-001",
      account_name: "Northstar Logistics",
      ticket_id: "TKT-450",
    },
    details:
      "TKT-450 resolution states customer was charged INR 250 fee after 30 minutes. This contradicts Northstar Agreement Section 2 (waives cancellation fee for all BOOKED shipments before pickup).",
    actionable_recommendation: "Flag ticket TKT-450 in knowledge base as non-authoritative to prevent agent misinformation.",
    source_citation: "05_Northstar_Logistics_Enterprise_Agreement.pdf (Section 2) vs TKT-450",
  });

  const critical_count = alerts.filter((a) => a.severity === "critical").length;
  const high_count = alerts.filter((a) => a.severity === "high").length;

  return {
    snapshot_time: SNAPSHOT_TIME,
    total_alerts: alerts.length,
    critical_count,
    high_count,
    alerts,
  };
}
