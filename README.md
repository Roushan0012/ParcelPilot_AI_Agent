# ParcelPilot AI Operations & Support Agent

A full-stack, autonomous internal operations copilot built for **ParcelPilot**, an enterprise B2B logistics platform. The system answers operational inquiries across heterogeneous policies, reasons over signed enterprise agreements with conflicting authority tiers, performs temporal calculations against a fixed snapshot time, detects proactive SLA breaches and unclaimed carrier fault credits, executes human-confirmed state mutations via a deterministic confirmation gate, supports **Voice Input (Whisper STT)**, and provides a comprehensive **Evaluation & Observability Dashboard** (latency, token usage, cost tracking).

---

## 🌟 Key Highlights & System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                  ParcelPilot Next.js 14 Web App                                   |
|   - Modern Dark-Mode Operations Interface (Tailwind CSS, Glassmorphism, Monospace Activity)       |
|   - Left Sidebar: RLS Role Switcher, System Snapshot Clock, Interactive Multi-Step Starters       |
|   - Real-Time Chat: Tool Call Event Badges, Markdown Tables, Inline Source Citation Drawers       |
|   - Voice Input (Whisper STT): Native Mic Button, Live Pulsing Timer, Non-blocking Transcription  |
|   - Proactive Issue Scanner Dashboard: Real-Time Anomaly Detection & Contract SLA Alerter         |
|   - Evaluation & Metrics Dashboard: Live Latency (ms), Token Usage (In/Out), Cost ($), Charts     |
|   - Knowledge Base & Agreements Explorer + Confirmed Actions Audit Trail                          |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                Next.js API & Orchestration Layer                                  |
|   - /api/chat: Multi-step Reasoning Loop with Auto Model Fallback (gpt-oss, llama, qwen)         |
|   - /api/transcribe: Speech-to-Text Transcription via Groq Whisper (whisper-large-v3-turbo)        |
|   - /api/eval: Observability Telemetry & Aggregated Performance Metrics (RLS-protected)           |
|   - /api/actions/confirm: Two-Phase Human-in-the-Loop Confirmation Gate                           |
|   - /api/proactive: Live Anomaly & Outage Compliance Scanner                                      |
|   - /api/knowledge: Document Chunks & Normalized PostgreSQL Table Inspector                       |
+----------------------+--------------------------+-----------------------+-------------------------+
                       |                          |                       |
                       v                          v                       v
+--------------------------+   +--------------------------+   +-------------------------------------+
|     search_documents     |   |   query_account_data     |   |            create_action            |
| 1024-dim Voyage-3 vector |   | PostgreSQL scoped by RLS |   | Prepares PendingAction preview card |
| search with Tier sorting |   | & snapshot anchor        |   | for operator UI approval            |
+--------------------------+   +--------------------------+   +-------------------------------------+
                       |                          |                       |
                       +--------------------------+-----------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                   Supabase PostgreSQL Instance                                    |
|   - pgvector extension: 1024-dim cosine distance indexing (HNSW)                                  |
|   - Normalized tables: accounts, orders, tickets, actions, document_chunks, eval_logs             |
|   - Row-Level Security (RLS) policies: ops_manager, support_agent, customer_mock                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 🎙️ Voice Input (Whisper STT)

The chat input interface includes native speech-to-text integration powered by OpenAI-compatible Whisper models:
* **Native Microphone Button**: Positioned immediately to the left of the Send button.
* **3 Dynamic Visual States**:
  - **Idle**: Muted neutral mic icon matching the dark-mode theme.
  - **Recording**: Pulses in teal (`animate-pulse`) with a live timer badge (`REC 00:04`) and a stop icon.
  - **Processing**: Transitions to a spinner (`Loader2`) while transcribing.
* **Audio Capture & Endpoint**: Captures audio via browser `MediaRecorder` API (`audio/webm`) and posts to `POST /api/transcribe` utilizing Groq's **`whisper-large-v3-turbo`**.
* **Operator Review**: Fills transcribed text into the chat input for operator review/editing without auto-submitting.
* **Inline Error Banner**: Dismissible banner displays actionable guidance for blocked mic permissions or network issues without crashing the chat.

---

## 📊 Evaluation & Observability Dashboard

A dedicated observability interface accessible in the sidebar under **"Evaluation & Metrics" (⚡)**:
* **Real-Time KPI Cards**:
  - ⏱️ **Avg Latency (ms)**: Average response time across the last 20 turns.
  - ⚡ **Total Tokens Used**: Cumulative input + output tokens (Session & All-time).
  - 💰 **Estimated Total Cost ($ USD)**: Calculated based on token rates ($0.59/$0.79 per 1M tokens for Groq; $3.00/$15.00 for Claude).
  - 📑 **Total Queries Run**: Count of executed reasoning cycles.
  - 🛡️ **Error Rate (%)**: Ratio of failed inquiries.
* **Interactive Latency History Bar Chart**: Visualizes response times per turn with hover latency tooltips.
* **Recent Interaction Logs Table**:
  - Displays Timestamp, Truncated Query, Latency (ms), Tokens (In / Out), Tools Called Badges, Model Name, Estimated Cost, and Status.
* **Non-Blocking Telemetry**: Asynchronous fire-and-forget logging in `POST /api/chat` that adds 0ms latency to the user experience.
* **RLS Telemetry Protection**: Restricted to `ops_manager` and internal staff; lower privilege roles (`customer_mock`) receive an Access Restricted screen.

---

## 📚 Source Authority Hierarchy

To prevent hallucinations and respect contractual agreements, the system enforces a strict 4-tier authority hierarchy:

| Tier | Source Category | Description & Examples | Precedence Rule |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Highest)** | **Signed Enterprise Agreements** | `05_Northstar_Enterprise_Agreement.pdf`, `06_LumenWorks_Service_Agreement.pdf` | **Strictly overrides** generic policies for that customer (e.g. Northstar cancellation fee waiver, custom 15-min P1 SLA, LumenWorks fixed INR 300 credit). |
| **Tier 2** | **Current Policies & SOPs** | `01_Support_Policy_v3_CURRENT.pdf`, `03_Cancellation_and_Service_Credit_SOP_v4.pdf` | Standard operational rules. Explicitly **supersedes deprecated Policy v2**. Default cancellation fee INR 250, default credit lower of INR 500 or 10% fee. |
| **Tier 3** | **Product Guides & Known Issues** | `04_Product_Operations_Guide_and_Known_Issues.pdf` | Technical constraints (5,000 CSV limit) and live bugs (`KI-208` bulk upload failures, `KI-211` webhook latency). |
| **Tier 4 (Context Only)**| **Historical Tickets & Notes** | `02_Support_Policy_v2_DEPRECATED.pdf`, `TKT-450`, `TKT-451` | Past agent resolutions are treated as **context only** and flagged when they contradict active Tier 1 or Tier 2 sources. |

---

## ⏱️ Rigid Temporal Anchoring

All temporal calculations are deterministically evaluated against the dataset reference anchor:
**`2026-08-16 11:00 Asia/Kolkata (IST)`**
* **Delays**: Evaluated as `Snapshot Time - Scheduled Window End Time`.
* **SLAs**: Evaluated as `Snapshot Time - Ticket Creation Time`.

---

## 🔒 Row-Level Security (RLS) & Access Control

Access control is enforced at the database layer in PostgreSQL:
* **`ops_manager`**: Full administrative read/write access across all accounts, orders, tickets, and evaluation metrics.
* **`support_agent`**: Global read access for cross-account troubleshooting and action proposal creation.
* **`customer_mock`**: Scoped strictly to the active customer account (e.g., `ACCT-001` or `ACCT-002`). Queries attempting to access other accounts or internal evaluation logs return access restrictions.

---

## 🗄️ Supabase PostgreSQL Database Schema

The database consists of **6 primary tables** defined in [`supabase/schema.sql`](supabase/schema.sql):

1. **`accounts`**: Customer registry, subscription plan, CSM, and contract filename.
2. **`orders`**: Shipment details, carrier, booking timestamp, pickup window, shipment fee, and carrier fault flags.
3. **`tickets`**: Support tickets, channel, subject, description, assigned agent, and historical context notes.
4. **`actions`**: Two-phase confirmation gate audit log (`PENDING_CONFIRMATION` $\rightarrow$ `EXECUTED` / `REJECTED`).
5. **`document_chunks`**: RAG vector store with **1024-dim Voyage-3 embeddings**, authority levels, and HNSW cosine distance index.
6. **`eval_logs`**: Performance telemetry, latency, token counts, tool usage, model, cost, and error logs.
7. **`match_documents()`**: PostgreSQL stored procedure (RPC) for semantic cosine similarity search.

---

## 🚀 Quick Start & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Roushan0012/ParcelPilot_AI_Agent.git
cd ParcelPilot_AI_Agent
npm install
```

### 2. Environment Configuration
Create a `.env.local` file with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://qmjtbovedceegyblbbuj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GROQ_API_KEY=your_groq_api_key
VOYAGE_API_KEY=your_voyage_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Verification & Test Suites

You can run automated test suites for each phase directly from the terminal:

### Test Phase 1 (Data Ingestion, Vector Search & Agreement Overrides):
```bash
npx tsx scripts/test_phase1.ts
```

### Test Phase 2 (Multi-Step Tool Chaining, RLS & Confirmation Gate):
```bash
npx tsx scripts/test_phase2.ts
```

---

## 📋 Pre-Configured Test Scenarios in the UI

1. **Northstar Cancellation Fee Waiver**:
   * *Query*: `"Can Northstar cancel ORD-1001 without a cancellation fee? Explain why."`
   * *Verifies*: Northstar Agreement (Tier 1) waiving cancellation fees on `BOOKED` shipments, overriding standard SOP v4 INR 250 fee.
2. **LumenWorks Service Credit Action**:
   * *Query*: `"Check order ORD-2002 for LumenWorks. Why was pickup delayed, what credit applies under their contract, and propose the credit action."`
   * *Verifies*: 4.5-hour delay calculation against snapshot time, RoadRunner carrier fault, custom fixed INR 300 credit rule, and inline Action Confirmation Card.
3. **P1 Outage & SLA Compliance**:
   * *Query*: `"Check ticket TKT-501 for Northstar. Is our P1 SLA compliant relative to the snapshot time, and what action should we take?"`
   * *Verifies*: 30 minutes elapsed on HTTP 500 outage, custom 15-minute SLA breach detection, and P1 escalation card.
4. **Product Defect & Known Issue Correlation**:
   * *Query*: `"LumenWorks reported ticket TKT-502 where their 4,200-row CSV upload failed. Is this a plan limitation or a known product issue?"`
   * *Verifies*: Correlating issue with `KI-208` (intermittent bug on $>3,000$ rows) and dismissing incorrect historical ticket advice (`TKT-451`).
5. **Observability & Evaluation Telemetry**:
   * *Action*: Click on the **"Evaluation & Metrics" (⚡)** tab in the sidebar after running any query above.
   * *Verifies*: Real latency, token consumption, tools invoked, and cost tracking populated live in the dashboard.

---

## 📑 Deliverables Documentation

* **[`ARCHITECTURE.md`](ARCHITECTURE.md)**: Agent design, tool schemas, PostgreSQL & pgvector schema, source hierarchy conflict resolution, security model, and technical trade-offs.
* **[`PRODUCT.md`](PRODUCT.md)**: Proactive issue detection engine, trust & reliability safeguards, future roadmap, and primary success metrics.

---

## 📦 GitHub Repository
🔗 **https://github.com/Roushan0012/ParcelPilot_AI_Agent.git**
