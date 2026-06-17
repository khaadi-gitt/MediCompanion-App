-- Add embed_provider column to app_config
-- Values: 'auto' (OpenAI → Ollama fallback) | 'pubmedbert' (local FastAPI on :8001)
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS embed_provider VARCHAR(50) NOT NULL DEFAULT 'auto'
  AFTER rag_top_k;

-- Set current row to auto (existing behaviour unchanged)
UPDATE app_config SET embed_provider = 'auto' WHERE id = 1;
