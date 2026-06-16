-- ============================================================
-- MediCompanion RAG Setup — run once in Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Medical documents table
--    768 dims — works for both providers:
--      OpenAI  text-embedding-3-small with dimensions:768 (native truncation)
--      Ollama  nomic-embed-text / MedCPT / any 768-dim local model
create table if not exists public.medical_documents (
  id         bigserial primary key,
  source     text not null default 'admin_upload',
  title      text not null,
  chunk_id   int  not null,
  content    text not null,
  embedding  vector(768),
  metadata   jsonb,
  created_at timestamptz not null default now(),
  unique (title, chunk_id)
);

-- 3. Index for fast cosine similarity search
create index if not exists idx_medical_docs_embedding
  on public.medical_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Vector similarity search RPC (called by backend at chat time)
create or replace function match_medical_documents(
  query_embedding vector(768),
  match_count     int
)
returns table (
  id         bigint,
  title      text,
  content    text,
  similarity float
)
language sql stable as $$
  select
    id,
    title,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from public.medical_documents
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Chat history table (stores RAG-grounded conversations)
create table if not exists public.chat_history (
  id          bigserial primary key,
  session_id  text not null,
  query       text not null,
  response    text not null,
  confidence  text,
  similarity  float,
  llm_used    text,
  created_at  timestamptz not null default now()
);
