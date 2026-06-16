'use strict';
const { _SECTION_PATTERNS, _MEDICAL_ENTITY_REGEX } = require('../config');

function maskPii(text) {
  let t = String(text || '');
  t = t.replace(/\bPatient\s+[A-Z][a-z]+ [A-Z][a-z]+\b/g, 'Patient [NAME]');
  t = t.replace(/\b(?:DOB|Date of Birth|born)\s*:?\s*\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/gi, '[DOB REDACTED]');
  t = t.replace(/\b(?:MRN|Patient ID|Record No\.?)\s*#?\s*\d{4,10}\b/gi, '[ID REDACTED]');
  t = t.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]');
  t = t.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  return t;
}

function detectSection(text) {
  const sample = String(text || '').slice(0, 300);
  for (const [section, pattern] of Object.entries(_SECTION_PATTERNS)) {
    if (pattern.test(sample)) return section;
  }
  return 'body';
}

function extractMedicalEntities(text) {
  const matches = [...String(text || '').slice(0, 1500).matchAll(_MEDICAL_ENTITY_REGEX)];
  return [...new Set(matches.map((m) => m[0].trim()))].slice(0, 10);
}

function splitRecursive(text, maxLen, overlap) {
  const separators = ['\n\n', '\n', '. ', ' ', ''];
  function split(s, sepIdx) {
    if (s.length <= maxLen || sepIdx >= separators.length) return [s];
    const sep   = separators[sepIdx];
    const parts = sep ? s.split(sep) : [...s];
    const chunks = [];
    let current  = '';
    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (candidate.length <= maxLen) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = part.length <= maxLen ? part : split(part, sepIdx + 1).join('');
      }
    }
    if (current) chunks.push(current);
    const overlapped = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) { overlapped.push(chunks[i]); continue; }
      const tail = chunks[i - 1].slice(-overlap);
      overlapped.push(tail + chunks[i]);
    }
    return overlapped;
  }
  return split(text, 0).filter((c) => c.trim().length > 0);
}

function chunkText(text, maxLen = 800, overlap = 100) {
  return splitRecursive(text.trim(), maxLen, overlap);
}

module.exports = { maskPii, detectSection, extractMedicalEntities, chunkText };
