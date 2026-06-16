'use strict';

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('Payload too large.'));
    });
    req.on('end', () => {
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON body.')); }
    });
    req.on('error', reject);
  });
}

function getBaseUrl(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').trim() || 'http';
  const host  = String(req.headers.host || '').trim();
  if (!host) return '';
  return `${proto}://${host}`;
}

module.exports = { json, readJson, getBaseUrl };
