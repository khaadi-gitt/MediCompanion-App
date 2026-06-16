'use strict';
const { ADMIN_SECRET } = require('../config');

function isAdmin(req) {
  if (!ADMIN_SECRET) return false;
  const header = String(req.headers['x-admin-secret'] || '').trim();
  return Boolean(header) && header === ADMIN_SECRET;
}

module.exports = { isAdmin };
