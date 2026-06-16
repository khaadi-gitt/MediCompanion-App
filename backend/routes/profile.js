'use strict';
const fs   = require('fs');
const path = require('path');
const { getMysqlPool }       = require('../db/pool');
const { json, readJson, getBaseUrl } = require('../utils/http');
const { sanitizeUuid, isValidEmail, saveProfileImageFromDataUrl, removeLocalProfileFileByUrl } = require('../utils/helpers');
const { clearUserScreeningState } = require('../services/screening');
const { UPLOADS_ROOT }       = require('../config');

module.exports = async function profileRoutes(req, res, url) {

  // GET /uploads/* — serve profile images
  if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
    const relative  = url.pathname.replace(/^\/+/, '');
    const candidate = path.normalize(path.join(__dirname, '..', relative));
    if (!candidate.startsWith(UPLOADS_ROOT)) {
      json(res, 400, { error: 'Invalid upload path.' }); return true;
    }
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      json(res, 404, { error: 'File not found.' }); return true;
    }
    const ext  = String(path.extname(candidate) || '').toLowerCase();
    const type =
      ext === '.png'  ? 'image/png'  :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif'  ? 'image/gif'  : 'image/jpeg';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' });
    fs.createReadStream(candidate).pipe(res);
    return true;
  }

  // POST /profile/update
  if (req.method === 'POST' && url.pathname === '/profile/update') {
    try {
      const body         = await readJson(req);
      const userId       = sanitizeUuid(body?.user_id);
      const fullName     = String(body?.fullName     || '').trim();
      const email        = String(body?.email        || '').trim().toLowerCase();
      const photoUrlInput= String(body?.photoUrl     || '').trim();
      const photoDataUrl = String(body?.photoDataUrl || '').trim();

      if (!userId) { json(res, 400, { error: 'user_id is required.' }); return true; }
      if (!fullName || !email || !isValidEmail(email)) {
        json(res, 400, { error: 'Valid fullName and email are required.' }); return true;
      }

      const pool = getMysqlPool();
      const [existingRows] = await pool.execute(
        'select id from users where email = ? and id <> ? limit 1',
        [email, userId]
      );
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        json(res, 409, { error: 'Email already used by another account.' }); return true;
      }

      let nextPhotoUrl = photoUrlInput;
      if (photoDataUrl) {
        nextPhotoUrl = saveProfileImageFromDataUrl({ dataUrl: photoDataUrl, userId, baseUrl: getBaseUrl(req) });
      }

      await pool.execute(
        'update users set full_name = ?, email = ?, photo_url = ? where id = ?',
        [fullName, email, nextPhotoUrl || null, userId]
      );

      const [rows] = await pool.execute(
        'select id, full_name, email, photo_url from users where id = ? limit 1',
        [userId]
      );
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!row) { json(res, 404, { error: 'User not found.' }); return true; }

      json(res, 200, {
        ok: true,
        user: {
          id:       String(row.id),
          fullName: String(row.full_name  || ''),
          email:    String(row.email      || ''),
          photoUrl: String(row.photo_url  || ''),
        },
      });
    } catch (error) {
      json(res, 500, { error: error.message || 'Could not update profile.' });
    }
    return true;
  }

  // POST /account/delete
  if (req.method === 'POST' && url.pathname === '/account/delete') {
    try {
      const body   = await readJson(req);
      const userId = sanitizeUuid(body?.user_id);
      if (!userId) { json(res, 400, { error: 'user_id is required.' }); return true; }

      const pool   = getMysqlPool();
      const [rows] = await pool.execute(
        'select id, email, photo_url from users where id = ? limit 1',
        [userId]
      );
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!row) { json(res, 404, { error: 'User not found.' }); return true; }

      const email    = String(row.email     || '').trim().toLowerCase();
      const photoUrl = String(row.photo_url || '').trim();

      await pool.execute('delete from chat_messages where user_id = ?', [userId]);
      if (email) await pool.execute('delete from otp_codes where email = ?', [email]);
      await pool.execute('delete from users where id = ? limit 1', [userId]);
      removeLocalProfileFileByUrl(photoUrl);
      clearUserScreeningState(userId);

      json(res, 200, { ok: true, deleted: true, user_id: userId });
    } catch (error) {
      json(res, 500, { error: error.message || 'Could not delete account.' });
    }
    return true;
  }

  return false;
};
