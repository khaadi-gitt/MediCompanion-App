-- ============================================================
-- MediCompanion RAG Migration — run once in your MySQL database
-- ============================================================

alter table app_config
  add column if not exists rag_enabled    tinyint(1)    not null default 0,
  add column if not exists rag_top_k      int           not null default 5,
  add column if not exists supabase_url   varchar(255)  not null default '',
  add column if not exists supabase_key   text          not null default '';
