'use strict';

function isAllowedOrigin(req, origin, allowedOrigins, env = process.env) {
  if (!origin || allowedOrigins.has(origin)) return true;
  try {
    const protocol = env.VERCEL ? 'https' : req.protocol;
    if (!['http', 'https'].includes(protocol)) return false;
    // Host is the authority the browser addressed. Do not trust forwarded host headers.
    const host = req.get('host');
    if (!host || /[\s/\\@?#]/.test(host)) return false;
    const requestOrigin = new URL(`${protocol}://${host}`).origin;
    return new URL(origin).origin === origin && origin === requestOrigin;
  } catch {
    return false;
  }
}

module.exports = { isAllowedOrigin };
