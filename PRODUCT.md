# ParcelPilot AI Support & Operations Agent — Product Note

## 1. Additional Client Problems Addressed

We addressed **BOTH Problem 1 (Proactive Issue Detection)** and **Problem 2 (Trust & Reliability)** to build a comprehensive, production-ready internal operations system.

### Problem 1: Proactive Issue Detection
* **Approach**: Built a dedicated **Proactive Issue Detection & Operations Intelligence Engine** (`/api/proactive`) accessible via the UI sidebar.
* **Capabilities**:
  1. **Active SLA Breach Alerter**: Scans high-severity tickets (e.g. Northstar `TKT-501` HTTP 500 outage) and flags that 30 minutes elapsed against a 15-minute custom SLA, providing a 1-click P1 escalation card.
  2. **Unclaimed Service Credit Hunter**: Detects carrier fault delays (e.g. LumenWorks `ORD-2002` missed pickup delayed 4.5 hours $>4$ hours) and pre-populates a fixed INR 300 credit claim.
  3. **Product Anomaly Correlator**: Links recurring customer issues (e.g. LumenWorks `TKT-502` 4,200-row CSV upload failure) to known product bug `KI-208` (intermittent failure on CSVs $>3,000$ rows) and recommends splitting workarounds.
  4. **Carrier Latency Warnings**: Identifies webhook synchronization lags (e.g. Northstar `TKT-504` SwiftShip driver collection) matching `KI-211` 20-minute webhook delay.

### Problem 2: Trust and Reliability
* **Approach**:
  1. **Rigid Source Authority Precedence**: Hard-coded mathematical sorting ensuring Tier 1 Signed Agreements strictly override Tier 2 Policies and SOPs.
  2. **Historical Knowledge Conflict Flagging**: Historical ticket resolutions (e.g. `TKT-450`, `TKT-451`) are explicitly labeled as non-authoritative advisory context to prevent agents from perpetuating past mistakes.
  3. **Interactive Citation Drawer**: Every answer includes clickable source pills that open a slide-over modal displaying the exact governing PDF section, version, and effective date.
  4. **Mandatory Confirmation Gate**: All state-changing actions (`create_action`) require explicit human operator confirmation in the UI before persisting to the database.

---

## 2. What We Would Build Next (Product Roadmap)

1. **Automated Carrier SLA Dispute & Reconciliation Engine**:
   * Automatically ingest carrier GPS and webhook ping timestamps, match against scheduled windows, and batch-file dispute claims to recover carrier penalties directly.
2. **Predictive Churn & Account Health Scoring**:
   * Aggregate open ticket severities, repeat cancellation fees, and pickup failure rates into a live health score displayed next to each customer in the CRM.
3. **Live Webhook Ingestion & WebSockets Push**:
   * Upgrade the proactive scanner from periodic polling to real-time WebSockets alerting operators the instant an SLA is within 5 minutes of breaching.

---

## 3. What Was Intentionally Left Out of This Submission

* **End-User Self-Service Portal for Customers**: We prioritized the internal support & operations agent first, as internal tooling allows for richer demonstration of multi-tier authority, database RLS, multi-tool reasoning, and proactive anomaly triage.
* **Automated Direct Financial Payouts**: We intentionally required human confirmation on service credit claims to comply with the SOP approval rule (credits $>1,000$ requiring manager sign-off) and prevent automated balance inflation.

---

## 4. Primary Success Metric

* **Primary Metric**: **Mean Time to Resolution (MTTR) for Complex Operational Inquiries & Escalations**.
* **Target**: Reduce internal investigation time on multi-source inquiries (e.g., verifying custom cancellation waivers or computing delayed-pickup service credits) from **14 minutes to under 30 seconds**, while maintaining a **100% policy-compliance accuracy rate**.
