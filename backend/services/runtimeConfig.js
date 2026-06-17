'use strict';
const { getMysqlPool } = require('../db/pool');
const { SUPABASE_URL_ENV, SUPABASE_SERVICE_KEY_ENV } = require('../config');
const { normalizeProvider } = require('../utils/helpers');

async function getRuntimeConfig() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `select id, openai_enabled, openai_model, openai_api_key, ai_provider, local_api_url, local_api_key,
            rag_enabled, rag_top_k, embed_provider, supabase_url, supabase_key,
            ftjob_id, ft_model, updated_at
     from app_config
     where id = 1
     limit 1`
  );
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) {
    throw new Error('app_config row not found in MySQL. Run backend/sql/mysql_runtime.sql first.');
  }
  return {
    id:               Number(row.id || 1),
    openai_enabled:   Boolean(Number(row.openai_enabled || 0)),
    openai_model:     String(row.openai_model || 'gpt-4o-mini'),
    openai_api_key:   String(row.openai_api_key || ''),
    ai_provider:      normalizeProvider(row.ai_provider),
    local_api_url:    String(row.local_api_url || 'http://127.0.0.1:11434'),
    local_api_key:    String(row.local_api_key || ''),
    rag_enabled:      Boolean(Number(row.rag_enabled || 0)),
    rag_top_k:        Number(row.rag_top_k || 5),
    embed_provider:   String(row.embed_provider || 'auto'),
    supabase_url:     String(row.supabase_url || SUPABASE_URL_ENV || ''),
    supabase_key:     String(row.supabase_key || SUPABASE_SERVICE_KEY_ENV || ''),
    ftjob_id:         row.ftjob_id ? String(row.ftjob_id) : null,
    ft_model:         row.ft_model  ? String(row.ft_model)  : null,
    updated_at:       row.updated_at,
  };
}

async function updateRuntimeConfig(patch) {
  const current = await getRuntimeConfig();
  const next = { ...current, ...patch, id: 1, updated_at: new Date().toISOString() };
  const pool = getMysqlPool();
  await pool.execute(
    `insert into app_config
      (id, openai_enabled, openai_model, openai_api_key, ai_provider, local_api_url, local_api_key,
       rag_enabled, rag_top_k, embed_provider, supabase_url, supabase_key, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
     on duplicate key update
      openai_enabled = values(openai_enabled),
      openai_model   = values(openai_model),
      openai_api_key = values(openai_api_key),
      ai_provider    = values(ai_provider),
      local_api_url  = values(local_api_url),
      local_api_key  = values(local_api_key),
      rag_enabled    = values(rag_enabled),
      rag_top_k      = values(rag_top_k),
      embed_provider = values(embed_provider),
      supabase_url   = values(supabase_url),
      supabase_key   = values(supabase_key),
      updated_at     = now()`,
    [
      1,
      next.openai_enabled ? 1 : 0,
      next.openai_model,
      next.openai_api_key,
      normalizeProvider(next.ai_provider),
      next.local_api_url,
      next.local_api_key,
      next.rag_enabled ? 1 : 0,
      Number(next.rag_top_k) || 5,
      String(next.embed_provider || 'auto'),
      String(next.supabase_url || ''),
      String(next.supabase_key || ''),
    ]
  );
  return getRuntimeConfig();
}

async function setFtJobId(jobId) {
  const pool = getMysqlPool();
  await pool.execute('update app_config set ftjob_id=?, ft_model=NULL where id=1', [jobId]);
}

async function setFtModel(modelId) {
  const pool = getMysqlPool();
  await pool.execute('update app_config set ft_model=? where id=1', [modelId]);
}

module.exports = { getRuntimeConfig, updateRuntimeConfig, setFtJobId, setFtModel };
