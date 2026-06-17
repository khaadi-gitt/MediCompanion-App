'use strict';
const fs   = require('fs');
const path = require('path');
const { getMysqlPool }    = require('../db/pool');
const { json, readJson }  = require('../utils/http');
const { isAdmin }         = require('../middleware/admin');
const { maskKey, normalizeProvider } = require('../utils/helpers');
const { getRuntimeConfig, updateRuntimeConfig, setFtJobId, setFtModel } = require('../services/runtimeConfig');
const { ingestPdfBuffer, listRagDocuments, deleteRagDocument, deleteAllRagDocuments, parseMultipartUpload } = require('../services/documents');
const { getEmbedProvider } = require('../services/embedding');
const { getTrainingExamples, buildJsonl, uploadTrainingFile, createFineTuningJob, getFineTuningJob, cancelFineTuningJob } = require('../services/finetune');
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SECRET, MIN_TRAINING_EXAMPLES, PUBLIC_DIR } = require('../config');

module.exports = async function adminRoutes(req, res, url) {

  // POST /admin/login
  if (req.method === 'POST' && url.pathname === '/admin/login') {
    try {
      const body     = await readJson(req);
      const email    = String(body?.email    || '').trim().toLowerCase();
      const password = String(body?.password || '').trim();
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        json(res, 500, { error: 'Admin credentials not configured in .env' }); return true;
      }
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        json(res, 401, { error: 'Invalid email or password.' }); return true;
      }
      json(res, 200, { ok: true, token: ADMIN_SECRET });
    } catch (err) {
      json(res, 500, { error: err.message });
    }
    return true;
  }

  // GET /admin/panel — serve admin HTML
  if (req.method === 'GET' && url.pathname === '/admin/panel') {
    const htmlPath = path.join(PUBLIC_DIR, 'admin.html');
    if (!fs.existsSync(htmlPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('admin.html not found'); return true;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return true;
  }

  // GET /admin/config
  if (req.method === 'GET' && url.pathname === '/admin/config') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized admin request.' }); return true; }
    try {
      const cfg = await getRuntimeConfig();
      json(res, 200, {
        openai_enabled:       cfg.openai_enabled,
        openai_model:         cfg.openai_model,
        openai_api_key_masked: maskKey(cfg.openai_api_key),
        ai_provider:          normalizeProvider(cfg.ai_provider),
        local_api_url:        String(cfg.local_api_url || '').trim(),
        local_api_key_masked: maskKey(cfg.local_api_key),
        rag_enabled:          cfg.rag_enabled,
        rag_top_k:            cfg.rag_top_k,
        embed_provider:       String(cfg.embed_provider || 'auto'),
        supabase_url:         String(cfg.supabase_url || '').trim(),
        supabase_key_masked:  maskKey(cfg.supabase_key),
        ftjob_id:             cfg.ftjob_id || null,
        ft_model:             cfg.ft_model  || null,
        updated_at:           cfg.updated_at,
      });
    } catch (error) { json(res, 500, { error: error.message || 'Could not read config.' }); }
    return true;
  }

  // POST /admin/config
  if (req.method === 'POST' && url.pathname === '/admin/config') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized admin request.' }); return true; }
    try {
      const body  = await readJson(req);
      const patch = {};
      if (typeof body.openai_enabled === 'boolean')                               patch.openai_enabled = body.openai_enabled;
      if (typeof body.openai_model   === 'string' && body.openai_model.trim())    patch.openai_model   = body.openai_model.trim();
      if (typeof body.openai_api_key === 'string' && body.openai_api_key.trim())  patch.openai_api_key = body.openai_api_key.trim();
      if (typeof body.ai_provider    === 'string' && body.ai_provider.trim())     patch.ai_provider    = normalizeProvider(body.ai_provider);
      if (typeof body.local_api_url  === 'string' && body.local_api_url.trim())   patch.local_api_url  = body.local_api_url.trim();
      if (typeof body.local_api_key  === 'string')                                patch.local_api_key  = body.local_api_key.trim();
      if (typeof body.rag_enabled    === 'boolean')                                                        patch.rag_enabled    = body.rag_enabled;
      if (typeof body.rag_top_k      === 'number' && body.rag_top_k > 0)                                  patch.rag_top_k      = Math.min(20, body.rag_top_k);
      if (typeof body.embed_provider === 'string' && ['auto','pubmedbert'].includes(body.embed_provider)) patch.embed_provider = body.embed_provider;
      if (typeof body.supabase_url   === 'string')                                                        patch.supabase_url   = body.supabase_url.trim();
      if (typeof body.supabase_key   === 'string' && body.supabase_key.trim())    patch.supabase_key   = body.supabase_key.trim();

      if (Object.keys(patch).length === 0) { json(res, 400, { error: 'No valid fields to update.' }); return true; }

      const updated = await updateRuntimeConfig(patch);
      json(res, 200, {
        ok: true,
        openai_enabled:       updated.openai_enabled,
        openai_model:         updated.openai_model,
        openai_api_key_masked: maskKey(updated.openai_api_key),
        ai_provider:          normalizeProvider(updated.ai_provider),
        local_api_url:        String(updated.local_api_url || '').trim(),
        local_api_key_masked: maskKey(updated.local_api_key),
        rag_enabled:          updated.rag_enabled,
        rag_top_k:            updated.rag_top_k,
        embed_provider:       String(updated.embed_provider || 'auto'),
        supabase_url:         String(updated.supabase_url || '').trim(),
        supabase_key_masked:  maskKey(updated.supabase_key),
        updated_at:           updated.updated_at,
      });
    } catch (error) { json(res, 500, { error: error.message || 'Could not update config.' }); }
    return true;
  }

  // POST /admin/documents/upload
  if (req.method === 'POST' && url.pathname === '/admin/documents/upload') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const cfg    = await getRuntimeConfig();
      if (!cfg.supabase_url || !cfg.supabase_key) {
        json(res, 400, { error: 'Supabase not configured. Set supabase_url and supabase_key in admin config.' }); return true;
      }
      const apiKey       = String(cfg.openai_api_key || '').trim();
      const embedProvider = getEmbedProvider(cfg, apiKey);
      const { buffer, filename } = await parseMultipartUpload(req);
      if (!filename.toLowerCase().endsWith('.pdf')) {
        json(res, 400, { error: 'Only PDF files are supported.' }); return true;
      }
      const title  = filename.replace(/\.pdf$/i, '').trim() || 'Untitled';
      const result = await ingestPdfBuffer(cfg, apiKey, buffer, title);
      json(res, 200, { ok: true, ...result, embed_provider: embedProvider.type === 'openai' ? 'openai' : `ollama:${embedProvider.model}` });
    } catch (err) { json(res, 500, { error: err.message || 'Ingestion failed.' }); }
    return true;
  }

  // GET /admin/documents
  if (req.method === 'GET' && url.pathname === '/admin/documents') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const cfg  = await getRuntimeConfig();
      const docs = await listRagDocuments(cfg);
      json(res, 200, { ok: true, documents: docs });
    } catch (err) { json(res, 500, { error: err.message || 'Could not list documents.' }); }
    return true;
  }

  // DELETE /admin/documents/:title
  if (req.method === 'DELETE' && url.pathname.startsWith('/admin/documents/')) {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const titleEncoded = url.pathname.slice('/admin/documents/'.length);
      const title        = decodeURIComponent(titleEncoded);
      if (!title) { json(res, 400, { error: 'Title is required.' }); return true; }
      const cfg = await getRuntimeConfig();
      await deleteRagDocument(cfg, title);
      json(res, 200, { ok: true });
    } catch (err) { json(res, 500, { error: err.message || 'Could not delete document.' }); }
    return true;
  }

  // DELETE /admin/documents
  if (req.method === 'DELETE' && url.pathname === '/admin/documents') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const cfg = await getRuntimeConfig();
      await deleteAllRagDocuments(cfg);
      json(res, 200, { ok: true });
    } catch (err) { json(res, 500, { error: err.message || 'Could not delete documents.' }); }
    return true;
  }

  // GET /admin/training/examples
  if (req.method === 'GET' && url.pathname === '/admin/training/examples') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const pool   = getMysqlPool();
      const [rows] = await pool.execute(
        'select id, system_prompt, user_input, assistant_output, enabled, created_at from training_examples order by id asc'
      );
      json(res, 200, { ok: true, examples: Array.isArray(rows) ? rows : [] });
    } catch (err) { json(res, 500, { error: err.message }); }
    return true;
  }

  // POST /admin/training/examples
  if (req.method === 'POST' && url.pathname === '/admin/training/examples') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const body           = await readJson(req);
      const userInput      = String(body?.user_input      || '').trim();
      const assistantOutput= String(body?.assistant_output|| '').trim();
      const systemPrompt   = String(body?.system_prompt   || '').trim() || null;
      if (!userInput || !assistantOutput) {
        json(res, 400, { error: 'user_input and assistant_output are required.' }); return true;
      }
      const pool     = getMysqlPool();
      const [result] = await pool.execute(
        'insert into training_examples (system_prompt, user_input, assistant_output, enabled) values (?, ?, ?, 1)',
        [systemPrompt, userInput, assistantOutput]
      );
      json(res, 200, { ok: true, id: result.insertId });
    } catch (err) { json(res, 500, { error: err.message }); }
    return true;
  }

  // PUT /admin/training/examples/:id
  if (req.method === 'PUT' && /^\/admin\/training\/examples\/\d+$/.test(url.pathname)) {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const id             = parseInt(url.pathname.split('/').pop(), 10);
      const body           = await readJson(req);
      const userInput      = String(body?.user_input      || '').trim();
      const assistantOutput= String(body?.assistant_output|| '').trim();
      const systemPrompt   = String(body?.system_prompt   || '').trim() || null;
      if (!userInput || !assistantOutput) {
        json(res, 400, { error: 'user_input and assistant_output are required.' }); return true;
      }
      const pool = getMysqlPool();
      await pool.execute(
        'update training_examples set system_prompt=?, user_input=?, assistant_output=? where id=?',
        [systemPrompt, userInput, assistantOutput, id]
      );
      json(res, 200, { ok: true });
    } catch (err) { json(res, 500, { error: err.message }); }
    return true;
  }

  // PATCH /admin/training/examples/:id/toggle
  if (req.method === 'PATCH' && /^\/admin\/training\/examples\/\d+\/toggle$/.test(url.pathname)) {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const parts = url.pathname.split('/');
      const id    = parseInt(parts[parts.length - 2], 10);
      const pool  = getMysqlPool();
      await pool.execute('update training_examples set enabled = 1 - enabled where id=?', [id]);
      json(res, 200, { ok: true });
    } catch (err) { json(res, 500, { error: err.message }); }
    return true;
  }

  // DELETE /admin/training/examples/:id
  if (req.method === 'DELETE' && /^\/admin\/training\/examples\/\d+$/.test(url.pathname)) {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized.' }); return true; }
    try {
      const id   = parseInt(url.pathname.split('/').pop(), 10);
      const pool = getMysqlPool();
      await pool.execute('delete from training_examples where id=?', [id]);
      json(res, 200, { ok: true });
    } catch (err) { json(res, 500, { error: err.message }); }
    return true;
  }

  // POST /admin/training/start
  if (req.method === 'POST' && url.pathname === '/admin/training/start') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized admin request.' }); return true; }
    try {
      const body       = await readJson(req);
      const suffix     = String(body?.suffix || 'medicompanion').trim().slice(0, 40) || 'medicompanion';
      const epochs     = Number(body?.n_epochs);
      const n_epochs   = Number.isFinite(epochs) && epochs >= 1 && epochs <= 10 ? Math.floor(epochs) : undefined;
      const runtimeCfg = await getRuntimeConfig();
      const apiKey     = String(runtimeCfg.openai_api_key || '').trim();
      if (!apiKey) { json(res, 400, { error: 'OpenAI API key is empty in app_config.' }); return true; }

      const examples = await getTrainingExamples();
      if (examples.length < MIN_TRAINING_EXAMPLES) {
        json(res, 400, { error: `At least ${MIN_TRAINING_EXAMPLES} enabled examples are required.`, current_examples: examples.length }); return true;
      }

      const jsonl    = buildJsonl(examples);
      const fileName = `medicompanion-train-${Date.now()}.jsonl`;
      const upload   = await uploadTrainingFile(apiKey, fileName, jsonl);
      const job      = await createFineTuningJob({
        apiKey, baseModel: runtimeCfg.openai_model || 'gpt-4o-mini-2024-07-18',
        trainingFileId: upload.id, suffix, n_epochs,
      });
      if (job?.id) await setFtJobId(job.id);
      json(res, 200, {
        ok: true,
        base_model:       runtimeCfg.openai_model || 'gpt-4o-mini-2024-07-18',
        uploaded_file_id: upload.id,
        training_examples: examples.length,
        fine_tuning_job:  job,
      });
    } catch (error) { json(res, 500, { error: error.message || 'Could not start training job.' }); }
    return true;
  }

  // GET /admin/training/status
  if (req.method === 'GET' && url.pathname === '/admin/training/status') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized admin request.' }); return true; }
    try {
      const runtimeCfg = await getRuntimeConfig();
      const apiKey     = String(runtimeCfg.openai_api_key || '').trim();
      const jobId      = String(url.searchParams.get('job_id') || '').trim();
      if (!apiKey)  { json(res, 400, { error: 'OpenAI API key is empty in app_config.' }); return true; }
      if (!jobId)   { json(res, 400, { error: 'job_id query param is required.' }); return true; }
      const job = await getFineTuningJob(apiKey, jobId);
      if (job?.status === 'succeeded' && job?.fine_tuned_model) await setFtModel(job.fine_tuned_model);
      json(res, 200, { ok: true, fine_tuning_job: job });
    } catch (error) { json(res, 500, { error: error.message || 'Could not read training status.' }); }
    return true;
  }

  // POST /admin/training/cancel
  if (req.method === 'POST' && url.pathname === '/admin/training/cancel') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized admin request.' }); return true; }
    try {
      const runtimeCfg = await getRuntimeConfig();
      const apiKey     = String(runtimeCfg.openai_api_key || '').trim();
      const body       = await readJson(req);
      const jobId      = String(body?.job_id || '').trim();
      if (!apiKey) { json(res, 400, { error: 'OpenAI API key is empty in app_config.' }); return true; }
      if (!jobId)  { json(res, 400, { error: 'job_id is required.' }); return true; }
      const job = await cancelFineTuningJob(apiKey, jobId);
      json(res, 200, { ok: true, fine_tuning_job: job });
    } catch (error) { json(res, 500, { error: error.message || 'Could not cancel training job.' }); }
    return true;
  }

  // POST /admin/training/apply
  if (req.method === 'POST' && url.pathname === '/admin/training/apply') {
    if (!isAdmin(req)) { json(res, 401, { error: 'Unauthorized admin request.' }); return true; }
    try {
      const body    = await readJson(req);
      const modelId = String(body?.model_id || '').trim();
      if (!modelId) { json(res, 400, { error: 'model_id is required.' }); return true; }
      const pool = getMysqlPool();
      await pool.execute('update app_config set openai_model=?, updated_at=now() where id=1', [modelId]);
      json(res, 200, { ok: true, applied_model: modelId });
    } catch (err) { json(res, 500, { error: err.message }); }
    return true;
  }

  return false;
};
