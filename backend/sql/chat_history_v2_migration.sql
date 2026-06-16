-- ============================================================
-- MediCompanion RAG v2 — Supabase migration
-- Run once in the Supabase SQL Editor
-- Safe to re-run (all statements use IF NOT EXISTS / CREATE OR REPLACE)
-- ============================================================

-- ── 1. Update match_medical_documents RPC ─────────────────────────────────────
-- v2 adds chunk_id and metadata to the return type so the backend can
-- deduplicate chunks across multi-query variants and display section/entity tags.
create or replace function match_medical_documents(
  query_embedding vector(768),
  match_count     int
)
returns table (
  id         bigint,
  title      text,
  chunk_id   int,
  content    text,
  metadata   jsonb,
  similarity float
)
language sql stable as $$
  select
    id,
    title,
    chunk_id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from public.medical_documents
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── 2. Add v2 analytics columns to chat_history ───────────────────────────────
alter table public.chat_history
  add column if not exists rewritten_query     text,
  add column if not exists faithfulness_score  float,
  add column if not exists hallucination_score float,
  add column if not exists sources             jsonb,   -- array of source titles
  add column if not exists embed_via           text,
  add column if not exists confidence          text,    -- 'high' | 'medium' | 'low'
  add column if not exists similarity          float,   -- faithfulness used as proxy
  add column if not exists llm_used            text;    -- model name that generated the answer

-- ── 3. Index for fast per-session history lookups ─────────────────────────────
create index if not exists idx_chat_history_session
  on public.chat_history (session_id, created_at desc);
