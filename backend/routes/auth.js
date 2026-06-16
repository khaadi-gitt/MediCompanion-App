'use strict';
const crypto    = require('crypto');
const { getMysqlPool }                            = require('../db/pool');
const { saveOtpCode, getActiveOtp, markOtpUsed, verifyOtpCode } = require('../db/otp');
const { json, readJson }                          = require('../utils/http');
const { isValidEmail, hashPassword, verifyPassword, isMysqlDuplicate, generateOtpCode } = require('../utils/helpers');
const { sendOtpEmail }                            = require('../services/mailer');
const { OTP_EXPIRY_MINUTES }                      = require('../config');

async function verifySocialToken(provider, accessToken) {
  if (provider === 'google') {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw Object.assign(new Error('Invalid Google access token.'), { status: 401 });
    const info = await resp.json();
    return {
      email:    String(info?.email   || '').trim().toLowerCase(),
      fullName: String(info?.name    || '').trim(),
      photoUrl: String(info?.picture || '').trim(),
    };
  }
  if (provider === 'facebook') {
    const url  = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw Object.assign(new Error('Invalid Facebook access token.'), { status: 401 });
    const info = await resp.json();
    if (info?.error) throw Object.assign(new Error('Invalid Facebook access token.'), { status: 401 });
    return {
      email:    String(info?.email               || '').trim().toLowerCase(),
      fullName: String(info?.name                || '').trim(),
      photoUrl: String(info?.picture?.data?.url  || '').trim(),
    };
  }
  throw new Error('Unknown provider.');
}

module.exports = async function authRoutes(req, res, url) {

  // POST /auth/signup/send-otp
  if (req.method === 'POST' && url.pathname === '/auth/signup/send-otp') {
    try {
      const body     = await readJson(req);
      const fullName = String(body?.fullName || '').trim();
      const email    = String(body?.email    || '').trim().toLowerCase();
      const password = String(body?.password || '');
      const photoUrl = String(body?.photoUrl || '').trim();

      if (!fullName || !email || !password) {
        json(res, 400, { error: 'fullName, email, and password are required.' }); return true;
      }
      if (!isValidEmail(email)) { json(res, 400, { error: 'Invalid email format.' }); return true; }
      if (password.length < 6)  { json(res, 400, { error: 'Password must be at least 6 characters.' }); return true; }

      const pool = getMysqlPool();
      const [existingRows] = await pool.execute('select id from users where email = ? limit 1', [email]);
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        json(res, 409, { error: 'Email already registered.' }); return true;
      }

      const otp     = generateOtpCode();
      const payload = JSON.stringify({ fullName, email, passwordHash: hashPassword(password), photoUrl });
      await saveOtpCode({ email, purpose: 'signup', otp, payloadJson: payload });
      await sendOtpEmail({
        to: email, subject: 'MediCompanion Signup OTP', otp,
        note: `Use this OTP to complete your signup. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      });
      json(res, 200, { ok: true, message: 'OTP sent to your email.' });
    } catch (error) {
      json(res, 500, { error: error.message || 'Could not send signup OTP.' });
    }
    return true;
  }

  // POST /auth/signup/verify-otp
  if (req.method === 'POST' && url.pathname === '/auth/signup/verify-otp') {
    try {
      const body  = await readJson(req);
      const email = String(body?.email || '').trim().toLowerCase();
      const otp   = String(body?.otp   || '').trim();
      if (!email || !otp) { json(res, 400, { error: 'email and otp are required.' }); return true; }

      const otpRow = await getActiveOtp({ email, purpose: 'signup' });
      if (!otpRow || !verifyOtpCode(otp, String(otpRow.otp_hash || ''))) {
        json(res, 401, { error: 'Invalid or expired OTP.' }); return true;
      }

      let payload = {};
      try { payload = JSON.parse(String(otpRow.payload_json || '{}')); } catch { payload = {}; }

      const fullName     = String(payload?.fullName     || '').trim();
      const passwordHash = String(payload?.passwordHash || '').trim();
      const photoUrl     = String(payload?.photoUrl     || '').trim();
      if (!fullName || !passwordHash) {
        json(res, 400, { error: 'Signup OTP payload is invalid. Request OTP again.' }); return true;
      }

      const userId = crypto.randomUUID();
      const pool   = getMysqlPool();
      await pool.execute(
        'insert into users (id, full_name, email, password_hash, photo_url) values (?, ?, ?, ?, ?)',
        [userId, fullName, email, passwordHash, photoUrl || null]
      );
      await markOtpUsed(Number(otpRow.id));
      json(res, 200, { ok: true, user: { id: userId, fullName, email, photoUrl } });
    } catch (error) {
      if (isMysqlDuplicate(error)) { json(res, 409, { error: 'Email already registered.' }); return true; }
      json(res, 500, { error: error.message || 'Signup verification failed.' });
    }
    return true;
  }

  // POST /auth/login
  if (req.method === 'POST' && url.pathname === '/auth/login') {
    try {
      const body     = await readJson(req);
      const email    = String(body?.email    || '').trim().toLowerCase();
      const password = String(body?.password || '');
      if (!email || !password) { json(res, 400, { error: 'email and password are required.' }); return true; }

      const pool   = getMysqlPool();
      const [rows] = await pool.execute(
        'select id, full_name, email, password_hash, photo_url from users where email = ? limit 1',
        [email]
      );
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!row || !verifyPassword(password, String(row.password_hash || ''))) {
        json(res, 401, { error: 'Invalid email or password.' }); return true;
      }
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
      json(res, 500, { error: error.message || 'Login failed.' });
    }
    return true;
  }

  // POST /auth/password/send-otp
  if (req.method === 'POST' && url.pathname === '/auth/password/send-otp') {
    try {
      const body  = await readJson(req);
      const email = String(body?.email || '').trim().toLowerCase();
      if (!email || !isValidEmail(email)) { json(res, 400, { error: 'Valid email is required.' }); return true; }

      const pool   = getMysqlPool();
      const [rows] = await pool.execute('select id from users where email = ? limit 1', [email]);
      if (!Array.isArray(rows) || rows.length === 0) {
        json(res, 200, { ok: true, message: 'If your account exists, OTP has been sent.' }); return true;
      }
      const otp = generateOtpCode();
      await saveOtpCode({ email, purpose: 'reset', otp, payloadJson: '{}' });
      await sendOtpEmail({
        to: email, subject: 'MediCompanion Password Reset OTP', otp,
        note: `Use this OTP to reset your password. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      });
      json(res, 200, { ok: true, message: 'OTP sent to your email.' });
    } catch (error) {
      json(res, 500, { error: error.message || 'Could not send reset OTP.' });
    }
    return true;
  }

  // POST /auth/password/reset
  if (req.method === 'POST' && url.pathname === '/auth/password/reset') {
    try {
      const body        = await readJson(req);
      const email       = String(body?.email       || '').trim().toLowerCase();
      const otp         = String(body?.otp         || '').trim();
      const newPassword = String(body?.newPassword || '');
      if (!email || !otp || !newPassword) {
        json(res, 400, { error: 'email, otp, and newPassword are required.' }); return true;
      }
      if (newPassword.length < 6) { json(res, 400, { error: 'Password must be at least 6 characters.' }); return true; }

      const otpRow = await getActiveOtp({ email, purpose: 'reset' });
      if (!otpRow || !verifyOtpCode(otp, String(otpRow.otp_hash || ''))) {
        json(res, 401, { error: 'Invalid or expired OTP.' }); return true;
      }

      const pool     = getMysqlPool();
      const [result] = await pool.execute(
        'update users set password_hash = ? where email = ?',
        [hashPassword(newPassword), email]
      );
      if (!result || Number(result.affectedRows || 0) < 1) {
        json(res, 404, { error: 'Account not found.' }); return true;
      }
      await markOtpUsed(Number(otpRow.id));
      json(res, 200, { ok: true, message: 'Password updated successfully.' });
    } catch (error) {
      json(res, 500, { error: error.message || 'Could not reset password.' });
    }
    return true;
  }

  // POST /auth/social  — Google / Facebook OAuth token verification
  if (req.method === 'POST' && url.pathname === '/auth/social') {
    try {
      const body        = await readJson(req);
      const provider    = String(body?.provider     || '').trim().toLowerCase();
      const accessToken = String(body?.access_token || '').trim();

      if (!['google', 'facebook'].includes(provider)) {
        json(res, 400, { error: 'provider must be "google" or "facebook".' }); return true;
      }
      if (!accessToken) {
        json(res, 400, { error: 'access_token is required.' }); return true;
      }

      let providerInfo;
      try {
        providerInfo = await verifySocialToken(provider, accessToken);
      } catch (err) {
        json(res, err.status || 401, { error: err.message || 'Token verification failed.' }); return true;
      }

      const { email, fullName, photoUrl } = providerInfo;
      if (!email || !isValidEmail(email)) {
        json(res, 400, { error: 'Provider did not return a valid email address. Make sure email permission is granted.' }); return true;
      }

      const pool   = getMysqlPool();
      const [rows] = await pool.execute(
        'select id, full_name, email, photo_url from users where email = ? limit 1',
        [email]
      );

      let user;
      if (Array.isArray(rows) && rows.length > 0) {
        user = rows[0];
      } else {
        // New social user — password_hash is a random non-guessable value so password login is impossible
        const userId            = crypto.randomUUID();
        const disabledPwdHash   = 'social:' + crypto.randomBytes(48).toString('hex');
        await pool.execute(
          'insert into users (id, full_name, email, password_hash, photo_url) values (?, ?, ?, ?, ?)',
          [userId, fullName || email, email, disabledPwdHash, photoUrl || null]
        );
        user = { id: userId, full_name: fullName || email, email, photo_url: photoUrl || '' };
      }

      json(res, 200, {
        ok:   true,
        user: {
          id:       String(user.id),
          fullName: String(user.full_name  || ''),
          email:    String(user.email      || ''),
          photoUrl: String(user.photo_url  || ''),
        },
      });
    } catch (error) {
      json(res, 500, { error: error.message || 'Social login failed.' });
    }
    return true;
  }

  return false; // not handled
};
