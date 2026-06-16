'use strict';
const busboyLib      = require('busboy');
const { PDFParse }   = require('pdf-parse');
const { supabaseRequest } = require('./rag');
const { batchEmbedTexts, getEmbedProvider } = require('./embedding');
const { maskPii, detectSection, extractMedicalEntities, chunkText } = require('../utils/text');

async function ingestPdfBuffer(cfg, apiKey, pdfBuffer, title) {
  const parser  = new PDFParse({ data: pdfBuffer });
  const parsed  = await parser.getText();
  const rawText = maskPii(String(parsed.text || '').trim());
  if (!rawText) throw new Error('PDF contains no extractable text.');

  const chunks = chunkText(rawText, 800, 100);
  if (chunks.length === 0) throw new Error('Text chunking produced no chunks.');

  // Skip already-ingested chunk_ids
  const existingResp = await supabaseRequest(
    cfg, 'GET',
    `/rest/v1/medical_documents?select=chunk_id&title=eq.${encodeURIComponent(title)}&order=chunk_id.asc`,
    null
  );
  const existingIds = new Set((existingResp || []).map((r) => Number(r.chunk_id)));
  const newChunks   = chunks
    .map((content, idx) => ({ idx, content }))
    .filter(({ idx }) => !existingIds.has(idx));

  if (newChunks.length === 0) {
    return { title, chunks_total: chunks.length, chunks_new: 0 };
  }

  const provider       = getEmbedProvider(cfg, apiKey);
  const embedModelName = provider.type === 'openai' ? 'text-embedding-3-small' : provider.model;
  console.log(`[RAG] Ingesting "${title}" via ${embedModelName} (${newChunks.length} new chunks)`);

  const embeddings = await batchEmbedTexts(cfg, apiKey, newChunks.map((c) => c.content));
  const rows       = newChunks.map(({ idx, content }, i) => ({
    source:    'admin_upload',
    title,
    chunk_id:  idx,
    content,
    embedding: embeddings[i],
    metadata:  {
      total_chunks: chunks.length,
      page_count:   parsed.numpages || null,
      section:      detectSection(content),
      entities:     extractMedicalEntities(content),
      embed_model:  embedModelName,
    },
  }));

  const inserted = await batchUpsertChunks(cfg, rows);
  return { title, chunks_total: chunks.length, chunks_new: inserted };
}

async function batchUpsertChunks(cfg, rows) {
  const BATCH = 20;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    await supabaseRequest(cfg, 'POST', '/rest/v1/medical_documents?on_conflict=title,chunk_id', slice);
    inserted += slice.length;
  }
  return inserted;
}

async function listRagDocuments(cfg) {
  const rows = await supabaseRequest(
    cfg, 'GET',
    '/rest/v1/medical_documents?select=title,chunk_id,created_at&order=title.asc,chunk_id.asc',
    null
  );
  if (!Array.isArray(rows)) return [];
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.title)) map.set(r.title, { title: r.title, chunk_count: 0, created_at: r.created_at });
    map.get(r.title).chunk_count += 1;
  }
  return [...map.values()];
}

async function deleteRagDocument(cfg, title) {
  await supabaseRequest(cfg, 'DELETE', `/rest/v1/medical_documents?title=eq.${encodeURIComponent(title)}`, null);
}

async function deleteAllRagDocuments(cfg) {
  await supabaseRequest(cfg, 'DELETE', `/rest/v1/medical_documents?title=neq.`, null);
}

function parseMultipartUpload(req) {
  return new Promise((resolve, reject) => {
    const bb = busboyLib({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
    let resolved = false;

    bb.on('file', (_field, stream, info) => {
      const { filename } = info;
      const chunks = [];
      stream.on('data', (d) => chunks.push(d));
      stream.on('end', () => {
        if (!resolved) {
          resolved = true;
          resolve({ buffer: Buffer.concat(chunks), filename: filename || 'upload.pdf' });
        }
      });
      stream.on('error', reject);
    });
    bb.on('error', reject);
    bb.on('finish', () => { if (!resolved) reject(new Error('No file field found in upload.')); });
    req.pipe(bb);
  });
}

module.exports = { ingestPdfBuffer, listRagDocuments, deleteRagDocument, deleteAllRagDocuments, parseMultipartUpload };
