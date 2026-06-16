'use strict';
const crypto = require('crypto');
const { EMBED_CACHE_MAX } = require('../config');

// md5(text) → float[]  —  LRU embedding cache (shared across requests)
const _embedCache = new Map();

function getEmbedProvider(cfg, apiKey) {
  const key = String(apiKey || cfg?.openai_api_key || '').trim();
  if (key && key.startsWith('sk-')) {
    return { type: 'openai', apiKey: key };
  }
  const ollamaUrl   = String(cfg?.local_api_url || process.env.LOCAL_API_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const ollamaModel = String(process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text');
  return { type: 'ollama', url: ollamaUrl, model: ollamaModel };
}

async function getQueryEmbedding(cfg, apiKey, text) {
  const provider = getEmbedProvider(cfg, apiKey);

  if (provider.type === 'openai') {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 768 }),
    });
    if (!resp.ok) throw new Error(`OpenAI embeddings failed: ${await resp.text()}`);
    const data = await resp.json();
    return data.data[0].embedding;
  }

  const resp = await fetch(`${provider.url}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: provider.model, prompt: text }),
  });
  if (!resp.ok) throw new Error(`Ollama embeddings (${provider.model}) failed: ${await resp.text()}`);
  const data = await resp.json();
  if (!Array.isArray(data.embedding)) {
    throw new Error(`Ollama returned no embedding for model "${provider.model}". Is it pulled?`);
  }
  return data.embedding;
}

async function embedCached(cfg, apiKey, text) {
  const key = crypto.createHash('md5').update(text).digest('hex');
  if (_embedCache.has(key)) return _embedCache.get(key);
  const vec = await getQueryEmbedding(cfg, apiKey, text);
  if (_embedCache.size >= EMBED_CACHE_MAX) {
    _embedCache.delete(_embedCache.keys().next().value); // evict oldest
  }
  _embedCache.set(key, vec);
  return vec;
}

async function batchEmbedTexts(cfg, apiKey, texts) {
  const provider = getEmbedProvider(cfg, apiKey);

  if (provider.type === 'openai') {
    const BATCH = 100;
    const allEmbeddings = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const slice = texts.slice(i, i + BATCH);
      const resp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: slice, dimensions: 768 }),
      });
      if (!resp.ok) throw new Error(`OpenAI batch embeddings failed: ${await resp.text()}`);
      const data = await resp.json();
      allEmbeddings.push(...data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
    }
    return allEmbeddings;
  }

  // Ollama fallback — embed one at a time
  console.log(`[RAG] Embedding ${texts.length} chunks via Ollama ${provider.model} (sequential)…`);
  const allEmbeddings = [];
  for (let i = 0; i < texts.length; i++) {
    const resp = await fetch(`${provider.url}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: provider.model, prompt: texts[i] }),
    });
    if (!resp.ok) throw new Error(`Ollama embeddings (${provider.model}) failed: ${await resp.text()}`);
    const data = await resp.json();
    if (!Array.isArray(data.embedding)) {
      throw new Error(`Ollama returned no embedding for model "${provider.model}". Is it pulled?`);
    }
    allEmbeddings.push(data.embedding);
    if ((i + 1) % 10 === 0) console.log(`[RAG] Embedded ${i + 1}/${texts.length} chunks`);
  }
  return allEmbeddings;
}

module.exports = { getEmbedProvider, getQueryEmbedding, embedCached, batchEmbedTexts };
