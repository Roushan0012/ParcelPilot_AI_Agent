# ParcelPilot AI Support & Operations Agent

An autonomous, multi-tool AI operations agent for **ParcelPilot**, a B2B logistics platform. Built with Next.js (App Router), Supabase (PostgreSQL + pgvector), Voyage AI embeddings, Anthropic Claude Sonnet & Groq LLM tool-use orchestration, Row-Level Security (RLS) access control, a confirmation gate for state-changing operations, and proactive issue detection.

---

## 🚀 Key Features

* **Rigid Source Authority Hierarchy**:
  * **Tier 1 (Highest)**: Signed customer agreements (`05_Northstar`, `06_LumenWorks`) override general policies.
  * **Tier 2**: `01_Support_Policy_v3_CURRENT` and `03_Cancellation_and_Service_Credit_SOP_v4` supersede `02_Support_Policy_v2_DEPRECATED`.
  * **Tier 3**: Product Operations Guide & Known Issues (`KI-208`, `KI-211`).
  * **Tier 4 (Context Only)**: Historical ticket resolutions treated as advisory context only.
* **Rigid Temporal Anchor**: Dataset snapshot `2026-08-16 11:00 Asia/Kolkata` is used as system "now" for all time-based SLA and delay calculations.
* **Multi-Tool Orchestration**:
  1. `search_documents(query, customer_scope)`: Semantic search over Voyage-3 embedded policy chunks.
  2. `query_account_data(entity, filters)`: RLS-scoped structured lookup over Postgres accounts, orders, and tickets.
  3. `create_action(action_type, payload)`: Generates structured pending action preview for human confirmation.
* **Confirmation Gate**: State-changing actions are never executed autonomously. The agent prepares a preview card for user approval before persisting to the database.
* **Proactive Issue Detection**: Automated scanner identifying SLA breaches, carrier fault credit opportunities, and platform technical anomalies.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
* **Backend & API**: Next.js API Routes / Server Handlers.
* **Database & RAG**: Supabase PostgreSQL + `pgvector` extension.
* **Embeddings**: Voyage AI (`voyage-3`, 1024-dim vectors).
* **LLM Engine**: Anthropic Claude 3.5 Sonnet / Groq (`openai/gpt-oss-120b`).

---

## 📦 Setup & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Roushan0012/ParcelPilot_AI_Agent.git
cd ParcelPilot_AI_Agent
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your API keys:
```bash
cp .env.example .env.local
```

### 3. Ingest Data Pack & Generate Embeddings
```bash
python3 scripts/ingest_data.py
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
