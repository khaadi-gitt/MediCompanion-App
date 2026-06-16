'use strict';
const http = require('http');
const path = require('path');


const loadEnv = require('./utils/loadEnv');
loadEnv(path.join(__dirname, '.env'));

const { PORT, PROFILE_UPLOADS_DIR } = require('./config');
const { setCorsHeaders }  = require('./middleware/cors');
const { json }            = require('./utils/http');
const { ensureDir }       = require('./utils/helpers');

const authRoutes    = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const chatRoutes    = require('./routes/chat');
const adminRoutes   = require('./routes/admin');

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (await profileRoutes(req, res, requestUrl)) return; // handles /uploads/* first (no auth)
    if (await authRoutes(req, res, requestUrl))    return;
    if (await chatRoutes(req, res, requestUrl))    return;
    if (await adminRoutes(req, res, requestUrl))   return;
  } catch (err) {
    console.error('[server] unhandled error:', err);
    if (!res.headersSent) json(res, 500, { error: 'Internal server error.' });
    return;
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  ensureDir(PROFILE_UPLOADS_DIR);
  console.log(`MediCompanion API running on http://localhost:${PORT}`);
});
