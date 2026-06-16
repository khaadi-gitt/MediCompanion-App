'use strict';
const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, OTP_EXPIRY_MINUTES } = require('../config');

let nodemailerLib   = null;
let smtpTransporter = null;

function getMailer() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error('SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM are required in backend/.env');
  }
  if (!nodemailerLib) {
    try { nodemailerLib = require('nodemailer'); }
    catch { throw new Error('nodemailer package is missing. Run: npm install nodemailer'); }
  }
  if (!smtpTransporter) {
    smtpTransporter = nodemailerLib.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return smtpTransporter;
}

async function sendOtpEmail({ to, subject, otp, note }) {
  const mailer = getMailer();
  await mailer.sendMail({
    from: SMTP_FROM, to, subject,
    text: `${note}\n\nYour OTP code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>${note}</p><p><strong>Your OTP code is: ${otp}</strong></p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  });
}

module.exports = { getMailer, sendOtpEmail };
