'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { MEDICAL_KEYWORDS, ALLOWED_TOPIC_KEYWORDS, PROFILE_UPLOADS_DIR, UPLOADS_ROOT } = require('../config');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function sanitizeUuid(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return null;
  return s;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, encoded) {
  const parts = String(encoded || '').split(':');
  if (parts.length !== 2) return false;
  const [salt, storedHash] = parts;
  const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch {
    return false;
  }
}

function isMysqlDuplicate(error) {
  return Number(error?.errno || 0) === 1062;
}

function normalizeProvider(value) {
  const p = String(value || 'openai').trim().toLowerCase();
  return p === 'local' ? 'local' : 'openai';
}

function maskKey(key) {
  const value = String(key || '').trim();
  if (!value) return '';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function looksMedical(text) {
  const value = text.toLowerCase();
  return MEDICAL_KEYWORDS.some((k) => value.includes(k));
}

function looksAllowedTopic(text) {
  const value = String(text || '').toLowerCase();
  return Object.values(ALLOWED_TOPIC_KEYWORDS).some((items) => items.some((k) => value.includes(k)));
}

function countTopicHits(text, list) {
  const value = String(text || '').toLowerCase();
  if (!value) return 0;
  let hits = 0;
  for (const keyword of list || []) {
    if (value.includes(String(keyword).toLowerCase())) hits += 1;
  }
  return hits;
}

function saveProfileImageFromDataUrl({ dataUrl, userId, baseUrl }) {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,([a-z0-9+/=\r\n]+)$/i.exec(String(dataUrl || ''));
  if (!m) throw new Error('Invalid image format. Use PNG/JPEG/WebP base64 data URL.');
  const type   = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
  const b64    = m[2].replace(/\s+/g, '');
  const buffer = Buffer.from(b64, 'base64');
  if (!buffer || buffer.length < 10) throw new Error('Invalid image payload.');
  if (buffer.length > 2 * 1024 * 1024) throw new Error('Image too large. Max 2MB.');

  const ext    = type === 'jpeg' ? 'jpg' : type;
  ensureDir(PROFILE_UPLOADS_DIR);
  const file   = `${userId}-${Date.now()}.${ext}`;
  const absPath = path.join(PROFILE_UPLOADS_DIR, file);
  fs.writeFileSync(absPath, buffer);
  const relUrl = `/uploads/profiles/${file}`;
  return baseUrl ? `${baseUrl}${relUrl}` : relUrl;
}

function removeLocalProfileFileByUrl(photoUrl) {
  const value  = String(photoUrl || '').trim();
  if (!value) return;
  const marker = '/uploads/profiles/';
  const idx    = value.indexOf(marker);
  if (idx < 0) return;
  const rel = value.slice(idx + 1);
  const abs = path.normalize(path.join(__dirname, '..', rel));
  if (!abs.startsWith(PROFILE_UPLOADS_DIR)) return;
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    try { fs.unlinkSync(abs); } catch {}
  }
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = {
  isValidEmail, sanitizeUuid, hashPassword, verifyPassword, isMysqlDuplicate,
  normalizeProvider, maskKey, ensureDir, looksMedical, looksAllowedTopic,
  countTopicHits, saveProfileImageFromDataUrl, removeLocalProfileFileByUrl,
  generateOtpCode,
};
