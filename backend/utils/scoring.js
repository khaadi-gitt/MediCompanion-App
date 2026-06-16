'use strict';
const { _STOPWORDS, _PRESCRIPTIVE_RX, ALLOWED_TOPIC_KEYWORDS } = require('../config');
const { looksMedical, countTopicHits } = require('./helpers');

function faithfulnessScore(answer, context) {
  const tokenize = (s) =>
    new Set(String(s || '').toLowerCase().match(/\b\w+\b/g)?.filter((t) => !_STOPWORDS.has(t)) || []);
  const aToks = tokenize(answer);
  const cToks = tokenize(context);
  if (aToks.size === 0) return 0;
  let overlap = 0;
  for (const t of aToks) { if (cToks.has(t)) overlap++; }
  return Math.min(1, (overlap / aToks.size) * 1.35);
}

function confidenceBand(faithfulness, hallucination, relevance) {
  const score = faithfulness * 0.45 + (1 - hallucination) * 0.35 + relevance * 0.20;
  const label = score >= 0.75 ? 'high' : score >= 0.55 ? 'medium' : score >= 0.35 ? 'low' : 'very_low';
  return { label, score: Math.round(score * 100) / 100 };
}

function safetyCheck(answer, halluScore) {
  for (const rx of _PRESCRIPTIVE_RX) {
    if (rx.test(answer)) return { safe: false, reason: 'prescriptive_patient_advice' };
  }
  return { safe: true, reason: 'ok' };
}

function confidenceLabel(percent) {
  const p = Number(percent || 0);
  if (p > 60) return 'High';
  if (p < 35) return 'Low';
  return 'Medium';
}

function confidenceLabelLower(percent) {
  const label = confidenceLabel(percent);
  if (label === 'High')   return 'high';
  if (label === 'Medium') return 'medium';
  return 'low';
}

function computeConfidencePercent(message, reply) {
  const migraineHits = countTopicHits(message, ALLOWED_TOPIC_KEYWORDS.migraine || []);
  const gastroHits   = countTopicHits(message, ALLOWED_TOPIC_KEYWORDS.gastro   || []);
  const topHits      = Math.max(migraineHits, gastroHits);

  let percent = 40;
  if      (topHits >= 5) percent = 90;
  else if (topHits === 4) percent = 85;
  else if (topHits === 3) percent = 78;
  else if (topHits === 2) percent = 68;
  else if (topHits === 1) percent = 55;

  const replyText = String(reply || '').toLowerCase();
  if (replyText.includes('i can currently assist only with these topics')) {
    percent = Math.min(percent, 40);
  }
  if (!looksMedical(String(message || ''))) percent = Math.min(percent, 35);
  if (percent < 0)   percent = 0;
  if (percent > 100) percent = 100;
  return Math.round(percent);
}

module.exports = {
  faithfulnessScore, confidenceBand, safetyCheck,
  confidenceLabel, confidenceLabelLower, computeConfidencePercent,
};
