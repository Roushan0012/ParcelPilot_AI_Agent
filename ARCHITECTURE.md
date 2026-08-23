# ParcelPilot AI Support & Operations Agent — Architecture Note

## 1. System Architecture Overview

The ParcelPilot AI Support Agent is an internal operations intelligence platform designed to reason across heterogeneous data sources with different authority levels, enforce database-level Row-Level Security (RLS), provide human-in-the-loop confirmation gates for operational state changes, support real-time **Voice Input (Whisper STT)**, and provide an integrated **Evaluation & Performance Observability Dashboard**.

```
+---------------------------------------------------------------------------------------------------+
|                                   Next.js 14 Web Application                                      |
|   - Modern Dark-Mode UI with Tailwind CSS & shadcn-inspired tokens                                |
|   - Left Sidebar: Role Switcher (RLS Context), Navigation & Quick Scenarios                       |
|   - Main Chat Area: System-style Tool Badges, Citations, Confirmation Cards                       |
|   - Voice Input: Native Mic Button, Live Pulsing Timer, Non-blocking Whisper STT                  |
|   - Proactive Issue Scanner & Knowledge Base Explorer                                             |
|   - Evaluation & Observability Dashboard (Latency, Token In/Out, Cost Tracking)                   |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                Next.js API & Agent Orchestrator                                   |
|   - /api/chat: Multi-step Reasoning Loop (Anthropic Claude 3.5 Sonnet / Groq Multi-Model Fallback) |
|   - /api/transcribe: Speech-to-Text Endpoint (Groq whisper-large-v3-turbo)                        |
|   - /api/eval: Performance Telemetry & Aggregated Metrics Endpoint (RLS Protected)                |
|   - /api/actions/confirm: Two-Phase Confirmation Gate Execution                                   |
|   - /api/proactive: Live Anomaly & SLA Compliance Scanner                                         |
|   - /api/knowledge: Document Chunks & Operational Tables Inspector                                |
+----------------------+--------------------------+-----------------------+-------------------------+
                       |                          |                       |
                       v                          v                       v
+--------------------------+   +--------------------------+   +-------------------------------------+
|     search_documents     |   |   query_account_data     |   |            create_action            |
| Semantic vector search   |   | Structured Postgres      |   | Prepares PendingAction preview      |
| via Voyage AI-3          |   | queries scoped by RLS    |   | for human confirmation gate         |
| with authority tiers     |   | and snapshot time        |   | (Never executes direct in DB)       |
+--------------------------+   +--------------------------+   +-------------------------------------+
                       |                          |                       |
                       +--------------------------+-----------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                   Supabase PostgreSQL Database                                    |
|   - pgvector extension: 1024-dim cosine distance indexing (HNSW)                                  |
|   - Normalized tables: accounts, orders, tickets, actions, document_chunks, eval_logs             |
|   - Row-Level Security (RLS) policies for ops_manager, support_agent, customer_mock               |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Agent Design & Multi-Step Reasoning Loop

* **Orchestration Loop**: The agent utilizes an autonomous tool-calling loop (Anthropic Claude 3.5 Sonnet / Groq OpenAI-compatible tool calling) that dynamically inspects user inquiries, executes intermediate tools, receives structured JSON outputs, and iteratively decides whether further retrieval or action generation is required before responding.
* **Temporal Anchoring**: The system injects the rigid dataset reference timestamp (`2026-08-16 11:00 Asia/Kolkata`) into all model prompts and tool calculators. All SLA durations, delays past pickup windows, and booking elapsed times are evaluated deterministically against this reference anchor.

---

## 3. Source Hierarchy & Conflict Resolution Engine

To prevent hallucination and respect legal boundaries, sources are categorized into strict authority tiers:

| Tier | Source Category | Examples | Authority Precedence |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Highest)** | **Signed Customer Agreements** | `05_Northstar_Enterprise_Agreement.pdf`, `06_LumenWorks_Service_Agreement.pdf` | **Strictly overrides** all generic policies for that specific customer account (e.g. Northstar fee waiver, custom SLAs). |
| **Tier 2** | **Current Policies & SOPs** | `01_Support_Policy_v3_CURRENT.pdf`, `03_Cancellation_and_Service_Credit_SOP_v4.pdf` | Standard operational rules for all accounts. **Explicitly supersedes Tier 4 (Deprecated)**. |
| **Tier 3** | **Product Documentation & Known Issues** | `04_Product_Operations_Guide_and_Known_Issues.pdf` | Technical constraints (e.g. CSV limit 5,000) and open bugs (`KI-208`, `KI-211`). |
| **Tier 4 (Non-Authoritative)** | **Historical Ticket Notes & Deprecated Policies** | `02_Support_Policy_v2_DEPRECATED.pdf`, `TKT-450`, `TKT-451` | Historical agent notes are treated as **context only** and explicitly flagged when they conflict with Tier 1/2 documents. |

---

## 4. Tool Design

1. **`search_documents(query, customer_scope)`**:
   * Generates dynamic query embeddings using **Voyage AI (`voyage-3`, 1024-dim)**.
   * Performs cosine similarity matching with scope-aware score boosting and authority-tier sorting via Supabase RPC `match_documents`.
   * Returns authoritative text snippets with version and effective date citations.
2. **`query_account_data(entity, filters)`**:
   * Queries normalized PostgreSQL records (`accounts`, `orders`, `tickets`).
   * Computes exact delay durations (e.g. `hours_past_window_end_at_snapshot`), carrier fault verification, and default credit calculations.
3. **`create_action(action_type, payload)`**:
   * Creates a `PendingAction` object in `PENDING_CONFIRMATION` status.
   * Renders an interactive confirmation card in the chat interface. Direct database mutation is barred until human confirmation.

---

## 5. Security & Access Control (Row-Level Security)

Access control is enforced at the database layer in PostgreSQL via RLS:
* `ops_manager`: Unrestricted read/write access across all accounts, orders, tickets, and evaluation telemetry.
* `support_agent`: Read access across all operational data for cross-account troubleshooting and action proposal creation.
* `customer_mock`: Row-level isolation restricting queries strictly to rows where `account_id = current_setting('app.current_account_id', true)`. Telemetry access is blocked with HTTP 403.

---

## 6. Observability & Performance Evaluation Engine

* **Non-Blocking Telemetry Logger**: On every `/api/chat` turn, the server measures `latency_ms`, prompt `input_tokens`, completion `output_tokens`, `tools_called`, model identifier, and computes estimated cost in USD ($0.59 / $0.79 per 1M tokens for Groq; $3.00 / $15.00 for Claude).
* **Supabase `eval_logs` Table**: Persists interaction records asynchronously in the background.
* **Evaluation Dashboard UI**: Aggregates 5 key performance metrics (Avg Latency across last 20 turns, Total Tokens, Estimated Total Cost, Total Queries, Error Rate) and renders an interactive SVG latency trend chart and interaction logs table.

---

## 7. Speech-to-Text (Whisper STT) Pipeline

* **Microphone Button**: Native input bar control with 3 visual states (Idle, Recording with live timer, Transcribing spinner).
* **Audio Capture**: Browser `MediaRecorder` API captures `audio/webm` chunks.
* **Transcription Route (`POST /api/transcribe`)**: Dispatches multipart audio payload to Groq's `whisper-large-v3-turbo` model.
* **Review Guard**: Transcribed speech is inserted into the chat input bar for operator validation without auto-submission.

---

## 8. Technical Trade-Offs

1. **Integrated Postgres + pgvector vs. Separate Vector DB (e.g. Pinecone)**:
   * *Decision*: Used pgvector on the same Supabase Postgres instance.
   * *Trade-off*: Eliminates data synchronization drift and enables single-database transactional consistency across structured records and embeddings.
2. **Deterministic Two-Phase Confirmation Gate vs. Pure LLM Execution**:
   * *Decision*: Decoupled action generation from database mutation.
   * *Trade-off*: Adds one click to the human operator's workflow but eliminates accidental financial commitments and unauthorized automated escalations.
3. **Fire-and-Forget Observability Logging vs. Synchronous Audit Writes**:
   * *Decision*: Executed evaluation logging asynchronously after responding.
   * *Trade-off*: Ensures 0ms latency penalty for chat users while capturing 100% of telemetry.
