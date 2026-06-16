'use strict';
const crypto = require('crypto');
const { getMysqlPool } = require('./pool');
const { OTP_EXPIRY_MINUTES } = require('../config');

function hashOtpCode(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function verifyOtpCode(otp, otpHash) {
  return hashOtpCode(otp) === String(otpHash || '');
}

async function saveOtpCode({ email, purpose, otp, payloadJson }) {
  const pool = getMysqlPool();
  const otpHash = hashOtpCode(otp);
  await pool.execute('delete from otp_codes where email = ? and purpose = ?', [email, purpose]);
  await pool.execute(
    `insert into otp_codes (email, purpose, otp_hash, payload_json, expires_at, used)
     values (?, ?, ?, ?, date_add(now(), interval ? minute), 0)`,
    [email, purpose, otpHash, payloadJson || '{}', OTP_EXPIRY_MINUTES]
  );
}

async function getActiveOtp({ email, purpose }) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `select id, otp_hash, payload_json
     from otp_codes
     where email = ? and purpose = ? and used = 0 and expires_at > now()
     order by id desc
     limit 1`,
    [email, purpose]
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function markOtpUsed(id) {
  if (!id) return;
  const pool = getMysqlPool();
  await pool.execute('update otp_codes set used = 1 where id = ?', [id]);
}

module.exports = { hashOtpCode, verifyOtpCode, saveOtpCode, getActiveOtp, markOtpUsed };
