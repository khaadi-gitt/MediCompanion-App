'use strict';
const { getMysqlPool }         = require('../db/pool');
const { json, readJson }       = require('../utils/http');
const { sanitizeUuid }         = require('../utils/helpers');
const { computeConfidencePercent, confidenceLabelLower, faithfulnessScore, confidenceBand, safetyCheck } = require('../utils/scoring');
const { getRuntimeConfig }     = require('../services/runtimeConfig');
const { normalizeProvider }    = require('../utils/helpers');
const { chatWithOpenAI, chatWithLocalModel } = require('../services/llm');
const { getEmbedProvider, embedCached }      = require('../services/embedding');
const { rewriteQuery, generateQueryVariants, hybridRetrieve, buildRagContextV2, selfVerifyGenerate, llmHallucinationCheck, saveRagChatHistory } = require('../services/rag');
const { handleMigraineScreening, handleGastroScreening, addMigraineScreeningOffer, addGastroScreeningOffer } = require('../services/screening');

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return Math.max(-1, Math.min(1, sum));
}

async function saveChatMessages({ sessionId, userId, userMessage, assistantReply, meta = {} }) {
  const pool = getMysqlPool();
  try {
    await pool.execute(
      `insert into chat_messages (session_id, user_id, role, content, created_at)
       values (?, ?, 'user', ?, now())`,
      [sessionId, userId, userMessage]
    );
    await pool.execute(
      `insert into chat_messages
         (session_id, user_id, role, content,
          rag_used, confidence_label, faithfulness_score, hallu_score,
          llm_used, sources, total_latency_ms, created_at)
       values (?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?, ?, now())`,
      [
        sessionId, userId, assistantReply,
        meta.ragUsed          ? 1    : 0,
        meta.confidenceLabel  ?? null,
        meta.faithfulnessScore != null ? meta.faithfulnessScore : null,
        meta.halluScore        != null ? meta.halluScore        : null,
        meta.llmUsed           ?? null,
        meta.sources           != null ? JSON.stringify(meta.sources) : null,
        meta.totalLatencyMs    != null ? Math.round(meta.totalLatencyMs) : null,
      ]
    );
  } catch (error) {
    console.error(`chat_messages save failed: ${error?.message || error}`);
  }
}

module.exports = async function chatRoutes(req, res, url) {

  // GET /api/chat/history
  if (req.method === 'GET' && url.pathname === '/api/chat/history') {
    try {
      const userId = String(url.searchParams.get('user_id') || '').trim();
      if (!userId) { json(res, 400, { error: 'user_id query param is required.' }); return true; }

      const pool   = getMysqlPool();
      const [rows] = await pool.execute(
        `select session_id, content
         from chat_messages
         where id in (
           select min(id)
           from chat_messages
           where user_id = ?
           group by session_id
         ) and role = 'user'`,
        [userId]
      );
      const sessions = (Array.isArray(rows) ? rows : []).map((row) => ({
        id:    row.session_id,
        title: row.content
          ? (row.content.length > 40 ? row.content.slice(0, 37) + '...' : row.content)
          : 'Untitled Chat',
      }));
      json(res, 200, { ok: true, sessions });
    } catch (error) {
      json(res, 500, { error: error.message || 'Could not fetch chat history.' });
    }
    return true;
  }

  // GET /api/chat/messages
  if (req.method === 'GET' && url.pathname === '/api/chat/messages') {
    try {
      const sessionId = String(url.searchParams.get('session_id') || '').trim();
      if (!sessionId) { json(res, 400, { error: 'session_id query param is required.' }); return true; }

      const pool   = getMysqlPool();
      const [rows] = await pool.execute(
        `select role, content as text, created_at,
                rag_used, confidence_label, faithfulness_score,
                hallu_score, llm_used, sources, total_latency_ms
         from chat_messages
         where session_id = ?
         order by created_at asc`,
        [sessionId]
      );

      const messages = (Array.isArray(rows) ? rows : []).map((row, idx) => {
        const ragUsed = Boolean(Number(row.rag_used));
        const msg     = { id: `m-${idx}`, role: row.role, text: row.text };
        if (row.role === 'assistant' && ragUsed) {
          let parsedSources;
          try { parsedSources = row.sources ? JSON.parse(row.sources) : undefined; } catch { /* skip */ }
          Object.assign(msg, {
            ragUsed:           true,
            confidenceLabel:   row.confidence_label   || undefined,
            faithfulnessScore: row.faithfulness_score != null ? Number(row.faithfulness_score) : undefined,
            halluScore:        row.hallu_score        != null ? Number(row.hallu_score)        : undefined,
            llmUsed:           row.llm_used           || undefined,
            sources:           parsedSources,
            totalLatencyMs:    row.total_latency_ms   != null ? Number(row.total_latency_ms)   : undefined,
          });
        }
        return msg;
      });

      json(res, 200, { ok: true, messages });
    } catch (error) {
      json(res, 500, { error: error.message || 'Could not fetch chat messages.' });
    }
    return true;
  }

  // POST /api/chat
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    try {
      const body      = await readJson(req);
      const message   = String(body?.message || '').trim();
      const history   = Array.isArray(body?.history) ? body.history : [];
      const sessionId = sanitizeUuid(body?.session_id);
      const userId    = sanitizeUuid(body?.user_id);

      if (!message) { json(res, 400, { error: 'Message is required.' }); return true; }

      //Screening intercepts
      const migraineScreeningReply = handleMigraineScreening({ sessionId, userId, message });
      if (migraineScreeningReply) {
        const confidencePercent = computeConfidencePercent(message, migraineScreeningReply);
        if (sessionId) await saveChatMessages({ sessionId, userId, userMessage: message, assistantReply: migraineScreeningReply });
        json(res, 200, {
          blocked: false, reply: migraineScreeningReply,
          confidence_score: confidencePercent, confidence_percent: confidencePercent,
          confidence_label: confidenceLabelLower(confidencePercent),
        });
        return true;
      }

      const gastroScreeningReply = handleGastroScreening({ sessionId, userId, message });
      if (gastroScreeningReply) {
        const confidencePercent = computeConfidencePercent(message, gastroScreeningReply);
        if (sessionId) await saveChatMessages({ sessionId, userId, userMessage: message, assistantReply: gastroScreeningReply });
        json(res, 200, {
          blocked: false, reply: gastroScreeningReply,
          confidence_score: confidencePercent, confidence_percent: confidencePercent,
          confidence_label: confidenceLabelLower(confidencePercent),
        });
        return true;
      }

      const runtimeCfg = await getRuntimeConfig();

      if (!runtimeCfg.openai_enabled) {
        json(res, 200, {
          blocked: true,
          reply: 'Chat is temporarily disabled. Please ask the admin to enable AI chat.',
          confidence_score: 0, confidence_percent: 0, confidence_label: 'low',
        });
        return true;
      }

      const configuredProvider = normalizeProvider(runtimeCfg.ai_provider);
      const hasOpenAIKey       = String(runtimeCfg.openai_api_key || '').trim().startsWith('sk-');
      const provider           = (configuredProvider === 'openai' && !hasOpenAIKey) ? 'local' : configuredProvider;
      if (configuredProvider !== provider) console.log('[Chat] No OpenAI key found — falling back to Ollama for chat.');

      //RAG v2 pipeline
      const embedProvider = getEmbedProvider(runtimeCfg, runtimeCfg.openai_api_key);
      const embedVia      = embedProvider.type === 'openai'
        ? 'text-embedding-3-small (768d)'
        : `Ollama ${embedProvider.model}`;
      const latencyMs = {};
      let ragContextText = '', ragSources = [], ragUsed = false, ragTopSim = 0;
      let rewrittenQuery = message, allQueryVariants = [message];

      if (runtimeCfg.rag_enabled) {
        try {
          const topK = Number(runtimeCfg.rag_top_k) || 5;
          let t0 = Date.now();
          rewrittenQuery          = await rewriteQuery(runtimeCfg, provider, message);
          latencyMs.query_rewrite = Date.now() - t0;

          t0 = Date.now();
          allQueryVariants          = await generateQueryVariants(runtimeCfg, provider, rewrittenQuery);
          latencyMs.query_expansion = Date.now() - t0;

          t0 = Date.now();
          const chunks        = await hybridRetrieve(runtimeCfg, runtimeCfg.openai_api_key, provider, allQueryVariants, topK);
          latencyMs.retrieval = Date.now() - t0;

          if (chunks.length > 0) {
            ragTopSim = chunks[0].similarity || 0;
            const { contextText, sources } = buildRagContextV2(chunks);
            ragContextText = contextText;
            ragSources     = sources;
            ragUsed        = true;
            console.log(`[RAG] Top chunk hybridScore=${(chunks[0].hybridScore || 0).toFixed(3)}  title="${chunks[0].title}"`);
          }
        } catch (ragErr) {
          console.error('[RAG] retrieval error:', ragErr.message);
        }
      }

      //Build LLM messages
      const messages = [
        {
          role: 'system',
          content:
            'You are MediCompanion, a medical education assistant. Reply in English only. You must only answer these topics: Migraine and Gastrointestinal (stomach) issues. If question is outside these 2 topics, politely refuse and list the 2 supported topics. Keep answers simple, clear, and short. Never provide diagnosis certainty or prescription dosage. If urgent red flags appear, advise immediate doctor/ER visit. Always end with this exact disclaimer: "This information is for educational purposes only and is not a substitute for professional medical advice."',
        },
        ...history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.text })),
        { role: 'user', content: message },
      ];

      //Self-verify generation
      let reply, genFaithfulness = 0;
      const t0Gen = Date.now();
      if (ragUsed) {
        const verified  = await selfVerifyGenerate(runtimeCfg, provider, messages, ragContextText);
        reply           = verified.reply;
        genFaithfulness = verified.faithfulness;
      } else {
        reply = provider === 'local'
          ? await chatWithLocalModel(runtimeCfg, messages, null)
          : await chatWithOpenAI(runtimeCfg, messages, null);
      }
      latencyMs.generation = Date.now() - t0Gen;

      if (!reply) { json(res, 502, { error: 'No response text from model.' }); return true; }

      //Scoring 
      const tScore = Date.now();
      let faith = genFaithfulness, halluScore = 0, halluMethod = 'none', answerRelevance = 0;

      if (ragUsed && ragContextText) {
        faith = faithfulnessScore(reply, ragContextText);
        if (faith >= 0.75) {
          halluScore  = 0;
          halluMethod = 'faith_override';
        } else {
          const hallu = await llmHallucinationCheck(runtimeCfg, provider, reply, ragContextText);
          halluScore  = hallu.hallucination_score;
          halluMethod = hallu.method;
        }
        try {
          const [qEmb, aEmb] = await Promise.all([
            embedCached(runtimeCfg, runtimeCfg.openai_api_key, message),
            embedCached(runtimeCfg, runtimeCfg.openai_api_key, reply.slice(0, 512)),
          ]);
          answerRelevance = Math.max(0, cosineSimilarity(qEmb, aEmb));
        } catch { /* non-fatal */ }
      }
      latencyMs.scoring = Date.now() - tScore;

      // Safety filter
      const { safe, reason: safetyReason } = safetyCheck(reply, halluScore);
      if (!safe) {
        console.log(`[RAG] Safety blocked: ${safetyReason}`);
        reply =
          '[Safety Filter] This response was blocked due to safety constraints ' +
          `(${safetyReason}). Please consult a qualified medical professional for specific advice.`;
      }

      //Screening offer hooks 
      const finalReply  = addMigraineScreeningOffer({ reply, message, sessionId, userId });
      const finalReply2 = finalReply === reply
        ? addGastroScreeningOffer({ reply, message, sessionId, userId })
        : finalReply;

      // Persist RAG analytics (fire-and-forget)
      if (ragUsed) {
        saveRagChatHistory(runtimeCfg, {
          sessionId, query: message, rewrittenQuery, answer: finalReply2,
          faithfulness: faith, halluScore, sources: ragSources,
          llmUsed: provider === 'local' ? 'ollama' : 'openai', embedVia,
        });
      }

      // Confidence
      let confidenceLabelStr, confidenceScoreNum;
      if (ragUsed) {
        const band         = confidenceBand(faith, halluScore, answerRelevance);
        confidenceLabelStr = band.label;
        confidenceScoreNum = Math.round(band.score * 100);
      } else {
        confidenceScoreNum = computeConfidencePercent(message, finalReply2);
        confidenceLabelStr = confidenceLabelLower(confidenceScoreNum);
      }

      //Persist to MySQL
      if (sessionId) {
        const totalMs = Object.values(latencyMs).reduce((s, v) => s + (Number(v) || 0), 0);
        await saveChatMessages({
          sessionId, userId, userMessage: message, assistantReply: finalReply2,
          meta: {
            ragUsed, confidenceLabel: confidenceLabelStr,
            faithfulnessScore: faith, halluScore,
            llmUsed: provider === 'local' ? 'ollama' : 'openai',
            sources: ragSources, totalLatencyMs: totalMs,
          },
        });
      }

      json(res, 200, {
        blocked:             false,
        reply:               finalReply2,
        confidence_score:    confidenceScoreNum,
        confidence_percent:  confidenceScoreNum,
        confidence_label:    confidenceLabelStr,
        rag_used:            ragUsed,
        sources:             ragSources,
        rewritten_query:     rewrittenQuery !== message ? rewrittenQuery : undefined,
        similarity:          ragUsed ? ragTopSim                                   : undefined,
        faithfulness_score:  ragUsed ? Math.round(faith        * 100) / 100       : undefined,
        hallucination_score: ragUsed ? Math.round(halluScore   * 100) / 100       : undefined,
        hallu_method:        ragUsed ? halluMethod                                 : undefined,
        answer_relevance:    ragUsed ? Math.round(answerRelevance * 100) / 100    : undefined,
        llm_used:            provider === 'local' ? 'ollama' : 'openai',
        embed_via:           ragUsed ? embedVia                                    : undefined,
        latency_ms:          latencyMs,
      });
    } catch (error) {
      json(res, 500, { error: error.message || 'Unexpected server error' });
    }
    return true;
  }

  return false;
};
