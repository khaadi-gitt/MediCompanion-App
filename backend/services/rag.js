'use strict';
const { llmCall, chatWithOpenAI, chatWithLocalModel } = require('./llm');
const { embedCached, getQueryEmbedding } = require('./embedding');
const { faithfulnessScore } = require('../utils/scoring');

// ── Supabase helper (shared with documents.js) ────────────────────────────────
async function supabaseRequest(cfg, method, urlPath, body) {
  const base = String(cfg.supabase_url || '').replace(/\/+$/, '');
  const key  = String(cfg.supabase_key || '');
  if (!base || !key) throw new Error('Supabase URL or key not configured.');

  const resp = await fetch(`${base}${urlPath}`, {
    method,
    headers: {
      apikey:         key,
      Authorization:  `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer:         method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${urlPath} failed (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── Query processing ──────────────────────────────────────────────────────────

async function rewriteQuery(runtimeCfg, provider, query) {
  const prompt =
    'You are a medical search query optimizer.\n' +
    'Rewrite the query into a specific, detailed clinical search query.\n' +
    'Expand abbreviations. Add related medical terminology.\n' +
    'Return ONLY the rewritten query — no labels, no explanation.\n\n' +
    `Query: ${query}\nRewritten:`;
  const raw = await llmCall(runtimeCfg, provider, prompt);
  if (!raw || raw.trim().length < 10) return query;
  const cleaned = raw.trim().replace(/^(?:rewritten query:|rewritten:|query:|answer:)\s*/i, '').trim();
  if (cleaned.length >= 10) {
    console.log(`[RAG] Query rewritten: "${query.slice(0, 60)}" → "${cleaned.slice(0, 60)}"`);
    return cleaned;
  }
  return query;
}

async function generateQueryVariants(runtimeCfg, provider, query) {
  const prompt =
    'Generate exactly 3 alternative search queries to find medical literature about the question below.\n' +
    'Use different terminology and clinical perspectives.\n' +
    'Return one query per line, no numbering, no labels.\n\n' +
    `Question: ${query}`;
  const raw      = await llmCall(runtimeCfg, provider, prompt);
  const variants = (raw || '').split('\n').map((l) => l.trim()).filter((l) => l.length > 8).slice(0, 3);
  const all      = [query, ...variants];
  const seen     = new Set();
  const unique   = [];
  for (const q of all) {
    const k = q.toLowerCase();
    if (!seen.has(k)) { seen.add(k); unique.push(q); }
  }
  console.log(`[RAG] Query variants: ${unique.length}`);
  return unique;
}

async function hydeEmbed(cfg, apiKey, runtimeCfg, provider, query) {
  const prompt =
    'Write a short paragraph (3-5 sentences) from a medical research paper ' +
    'that directly answers the following question. ' +
    'Use specific medical terminology. No preamble, just the paragraph.\n\n' +
    `Question: ${query}`;
  const hypothesis = await llmCall(runtimeCfg, provider, prompt);
  if (!hypothesis || hypothesis.length < 20) {
    console.log('[RAG] HyDE: empty hypothesis — falling back to raw query embed');
    return embedCached(cfg, apiKey, query);
  }
  console.log(`[RAG] HyDE hypothesis: ${hypothesis.slice(0, 100)}…`);
  return embedCached(cfg, apiKey, hypothesis);
}

// ── BM25 + hybrid retrieval ───────────────────────────────────────────────────

function bm25Score(docs, query) {
  if (!docs || docs.length === 0) return docs;
  const K1 = 1.5, B = 0.75;
  const corpus = docs.map((d) => String(d.content || '').toLowerCase().match(/\b\w+\b/g) || []);
  const avgdl  = corpus.reduce((s, t) => s + t.length, 0) / (corpus.length || 1);
  const qTerms = String(query || '').toLowerCase().match(/\b\w+\b/g) || [];
  const N      = docs.length;
  const df     = {};
  for (const term of qTerms) {
    df[term] = corpus.filter((tokens) => tokens.includes(term)).length;
  }
  for (let i = 0; i < docs.length; i++) {
    const tokens = corpus[i];
    const dl     = tokens.length;
    const tf     = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    let score = 0;
    for (const term of qTerms) {
      const f = tf[term] || 0;
      if (!f) continue;
      const idf = Math.log((N - (df[term] || 0) + 0.5) / ((df[term] || 0) + 0.5) + 1);
      score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * (dl / avgdl)));
    }
    docs[i] = { ...docs[i], bm25: score };
  }
  return docs;
}

async function hybridRetrieve(runtimeCfg, apiKey, provider, allQueries, topK) {
  const seen = new Map(); // `title__chunk_id` → doc (keeps highest similarity)
  for (const q of allQueries) {
    let emb;
    try {
      emb = await hydeEmbed(runtimeCfg, apiKey, runtimeCfg, provider, q);
    } catch {
      emb = await embedCached(runtimeCfg, apiKey, q);
    }
    const results = await supabaseRequest(runtimeCfg, 'POST', '/rest/v1/rpc/match_medical_documents', {
      query_embedding: emb,
      match_count:     topK * 3,
    });
    if (!Array.isArray(results)) continue;
    for (const doc of results) {
      const key = `${doc.title}__${doc.chunk_id ?? doc.id}`;
      if (!seen.has(key) || (doc.similarity || 0) > (seen.get(key).similarity || 0)) {
        seen.set(key, doc);
      }
    }
  }

  let merged = [...seen.values()].sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  console.log(`[RAG] Multi-query merge: ${merged.length} unique docs`);

  merged = bm25Score(merged, allQueries[0]);
  const maxBm25 = Math.max(...merged.map((d) => d.bm25 || 0), 1e-9);
  for (const d of merged) {
    d.hybridScore = 0.65 * (d.similarity || 0) + 0.35 * ((d.bm25 || 0) / maxBm25);
  }
  merged.sort((a, b) => (b.hybridScore || 0) - (a.hybridScore || 0));
  return merged.slice(0, topK);
}

async function retrieveRagChunks(cfg, apiKey, queryText) {
  const topK      = Number(cfg.rag_top_k) || 5;
  const embedding = await getQueryEmbedding(cfg, apiKey, queryText);
  const results   = await supabaseRequest(cfg, 'POST', '/rest/v1/rpc/match_medical_documents', {
    query_embedding: embedding,
    match_count:     topK,
  });
  return Array.isArray(results) ? results : [];
}

// ── Context builders ──────────────────────────────────────────────────────────

function buildRagContext(chunks) {
  if (!chunks || chunks.length === 0) return { contextText: '', sources: [] };
  const sources     = [...new Set(chunks.map((c) => c.title))];
  const contextText = chunks.map((c, i) => `[${i + 1}] ${c.title}\n${c.content}`).join('\n\n');
  return { contextText, sources };
}

function buildRagContextV2(chunks) {
  if (!chunks || chunks.length === 0) return { contextText: '', sources: [] };
  const sources     = [...new Set(chunks.map((c) => c.title))];
  const contextText = chunks.map((c, i) => {
    const meta     = c.metadata && typeof c.metadata === 'object' ? c.metadata : {};
    const section  = String(meta.section || 'body');
    const entities = Array.isArray(meta.entities) && meta.entities.length
      ? `  Entities: ${meta.entities.slice(0, 5).join(', ')}`
      : '';
    const score = ((c.hybridScore ?? c.similarity) || 0).toFixed(3);
    return `[Source ${i + 1} | ${c.title} | section=${section} | score=${score}]${entities}\n${c.content}`;
  }).join('\n\n---\n\n');
  return { contextText, sources };
}

// ── Evaluation ────────────────────────────────────────────────────────────────

async function llmHallucinationCheck(runtimeCfg, provider, answer, context) {
  const trivials = [
    'do not contain sufficient', 'insufficient evidence', 'no medical evidence',
    'do not contain information', 'not contain information regarding',
    'does not contain information', 'no information regarding',
    'excerpts do not', 'reference excerpts do not', 'provided excerpts',
  ];
  if (trivials.some((t) => answer.toLowerCase().includes(t))) {
    return { supported: false, hallucination_score: 0.0, unsupported_claims: [], method: 'trivial_skip' };
  }
  const prompt =
    'You are a medical fact-checker.\n\n' +
    `CONTEXT:\n${context.slice(0, 2000)}\n\n` +
    `ANSWER:\n${answer}\n\n` +
    'Evaluate whether the ANSWER is fully supported by the CONTEXT.\n' +
    'Return ONLY this JSON (no markdown, no fences):\n' +
    '{"supported": true, "hallucination_score": 0.0, "unsupported_claims": []}';
  const raw = await llmCall(runtimeCfg, provider, prompt);
  try {
    const fenced  = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(raw);
    const jsonStr = fenced ? fenced[1] : raw;
    const obj     = JSON.parse((jsonStr.match(/\{[\s\S]*\}/) || ['{}'])[0]);
    return {
      supported:           Boolean(obj.supported ?? false),
      hallucination_score: Math.max(0, Math.min(1, Number(obj.hallucination_score ?? 0.5))),
      unsupported_claims:  Array.isArray(obj.unsupported_claims) ? obj.unsupported_claims : [],
      method:              'llm_judge',
    };
  } catch {
    const faith = faithfulnessScore(answer, context);
    return {
      supported:           faith > 0.45,
      hallucination_score: Math.max(0, 0.65 - faith),
      unsupported_claims:  [],
      method:              'faith_fallback',
    };
  }
}

async function selfVerifyGenerate(runtimeCfg, provider, messages, ragContextText, maxIter = 2) {
  let bestReply = '', bestFaith = 0;
  for (let i = 0; i < maxIter; i++) {
    let msgs = messages;
    if (i > 0) {
      const repairNote =
        '\n[Quality note: A previous attempt did not use the provided excerpts well. ' +
        'Re-read the excerpts carefully. Look for synonymous terms — the concept may appear under a different name. ' +
        'Synthesise what IS present rather than saying the information is unavailable.]';
      const sysIdx = msgs.findIndex((m) => m.role === 'system');
      if (sysIdx >= 0) {
        msgs = msgs.map((m, idx) => idx === sysIdx ? { ...m, content: m.content + repairNote } : m);
      }
    }
    let reply;
    try {
      reply = provider === 'local'
        ? await chatWithLocalModel(runtimeCfg, msgs, ragContextText)
        : await chatWithOpenAI(runtimeCfg, msgs, ragContextText);
    } catch (err) {
      console.error(`[RAG] selfVerify iter ${i + 1} failed:`, err.message);
      continue;
    }
    if (!reply) continue;
    const faith = faithfulnessScore(reply, ragContextText);
    console.log(`[RAG] selfVerify iter ${i + 1}: faithfulness=${faith.toFixed(3)}`);
    if (faith > bestFaith) { bestReply = reply; bestFaith = faith; }
    if (faith > 0.35) break; // good enough — skip repair
  }
  return { reply: bestReply, faithfulness: bestFaith };
}

async function saveRagChatHistory(cfg, { sessionId, query, rewrittenQuery, answer, faithfulness, halluScore, sources, llmUsed, embedVia }) {
  try {
    await supabaseRequest(cfg, 'POST', '/rest/v1/chat_history', {
      session_id:          sessionId || 'anonymous',
      query,
      rewritten_query:     rewrittenQuery || query,
      response:            answer,
      confidence:          faithfulness > 0.6 ? 'high' : faithfulness > 0.35 ? 'medium' : 'low',
      similarity:          faithfulness,
      faithfulness_score:  faithfulness,
      hallucination_score: halluScore,
      sources:             sources || [],
      llm_used:            llmUsed,
      embed_via:           embedVia,
    });
  } catch (err) {
    console.error('[RAG] saveRagChatHistory error:', err.message);
  }
}

module.exports = {
  supabaseRequest,
  rewriteQuery, generateQueryVariants, hydeEmbed,
  bm25Score, hybridRetrieve, retrieveRagChunks,
  buildRagContext, buildRagContextV2,
  llmHallucinationCheck, selfVerifyGenerate, saveRagChatHistory,
};
