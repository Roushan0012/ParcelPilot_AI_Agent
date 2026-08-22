-- ==============================================================================
-- ParcelPilot AI Support & Operations Agent — Supabase PostgreSQL Schema + RLS
-- ==============================================================================

-- 1. Enable pgvector extension for semantic document retrieval
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Core Operational Tables
CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    plan TEXT NOT NULL, -- 'Enterprise', 'Growth', 'Standard'
    status TEXT NOT NULL DEFAULT 'active',
    csm TEXT,
    contract_file TEXT,
    premium_support BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    carrier TEXT NOT NULL,
    status TEXT NOT NULL, -- 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
    booked_at TIMESTAMPTZ NOT NULL,
    pickup_window_start TIMESTAMPTZ,
    pickup_window_end TIMESTAMPTZ,
    pickup_actual_at TIMESTAMPTZ,
    shipment_fee_inr NUMERIC(10, 2) NOT NULL,
    carrier_fault BOOLEAN DEFAULT FALSE,
    customer_fault BOOLEAN DEFAULT FALSE,
    cancellation_requested_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'pending', 'resolved', 'closed'
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'chat', 'email', 'phone'
    assigned_to TEXT,
    last_customer_message_at TIMESTAMPTZ,
    historical_resolution TEXT, -- Context only; not policy authority
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL, -- 'escalation', 'ticket_update', 'follow_up_task', 'service_credit_claim'
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION', -- 'PENDING_CONFIRMATION', 'EXECUTED', 'REJECTED'
    created_by_role TEXT NOT NULL DEFAULT 'support_agent',
    account_id TEXT REFERENCES accounts(account_id),
    ticket_id TEXT REFERENCES tickets(ticket_id),
    order_id TEXT REFERENCES orders(order_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    execution_result JSONB
);

-- 3. Document Chunks & Vector Store for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL, -- e.g. '01_Support_Policy_v3_CURRENT.pdf'
    version TEXT NOT NULL,     -- e.g. 'v3_CURRENT', 'v2_DEPRECATED', 'v4_SOP', 'v1_AGREEMENT'
    effective_date TEXT NOT NULL,
    section_title TEXT NOT NULL,
    content TEXT NOT NULL,
    customer_scope TEXT NOT NULL DEFAULT 'general', -- 'general', 'Northstar', 'LumenWorks'
    authority_level INT NOT NULL DEFAULT 2, -- 1: Signed Agreement (Highest), 2: Current Policy/SOP, 3: Operations Guide, 99: Deprecated Policy
    embedding vector(1024), -- Voyage-3 dimension is 1024
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on document embeddings for fast cosine similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 4. Match Documents RPC Function
CREATE OR REPLACE FUNCTION match_documents (
    query_embedding vector(1024),
    match_threshold float DEFAULT 0.2,
    match_count int DEFAULT 8,
    filter_scope text DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_name TEXT,
    version TEXT,
    effective_date TEXT,
    section_title TEXT,
    content TEXT,
    customer_scope TEXT,
    authority_level INT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.source_name,
        dc.version,
        dc.effective_date,
        dc.section_title,
        dc.content,
        dc.customer_scope,
        dc.authority_level,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE 
        (filter_scope IS NULL OR dc.customer_scope = 'general' OR dc.customer_scope ILIKE filter_scope OR filter_scope ILIKE '%' || dc.customer_scope || '%')
        AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
    ORDER BY dc.authority_level ASC, (dc.embedding <=> query_embedding) ASC
    LIMIT match_count;
END;
$$;

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Helper to extract session settings
-- Roles supported: 'ops_manager', 'support_agent', 'customer_user'
-- app.current_user_role & app.current_account_id

-- ACCOUNTS Policies
CREATE POLICY "Ops Manager full access to accounts"
ON accounts FOR ALL
USING (
    COALESCE(current_setting('app.current_user_role', true), 'ops_manager') = 'ops_manager'
    OR COALESCE(current_setting('app.current_user_role', true), '') = 'support_agent'
);

CREATE POLICY "Customer scoped access to accounts"
ON accounts FOR SELECT
USING (
    account_id = current_setting('app.current_account_id', true)
);

-- ORDERS Policies
CREATE POLICY "Ops Manager and Support Agents access orders"
ON orders FOR ALL
USING (
    COALESCE(current_setting('app.current_user_role', true), 'ops_manager') IN ('ops_manager', 'support_agent')
);

CREATE POLICY "Customer scoped access to orders"
ON orders FOR SELECT
USING (
    account_id = current_setting('app.current_account_id', true)
);

-- TICKETS Policies
CREATE POLICY "Ops Manager and Support Agents access tickets"
ON tickets FOR ALL
USING (
    COALESCE(current_setting('app.current_user_role', true), 'ops_manager') IN ('ops_manager', 'support_agent')
);

CREATE POLICY "Customer scoped access to tickets"
ON tickets FOR SELECT
USING (
    account_id = current_setting('app.current_account_id', true)
);

-- ACTIONS Policies
CREATE POLICY "Staff can manage actions"
ON actions FOR ALL
USING (
    COALESCE(current_setting('app.current_user_role', true), 'ops_manager') IN ('ops_manager', 'support_agent')
);

-- DOCUMENT CHUNKS Policies (Public read for knowledge base)
CREATE POLICY "Allow read access to document chunks"
ON document_chunks FOR SELECT
USING (true);

CREATE POLICY "Allow service role write to document chunks"
ON document_chunks FOR ALL
USING (true);
