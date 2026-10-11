'use strict';

const crypto = require('node:crypto');
const { createClient } = require('@libsql/client');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const validToken = token => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);

function createAuthStore({ url, authToken, credentialVersion, now = Date.now }) {
  // Never fall back to DATABASE_URL or a per-instance Vercel file/memory store.
  if (!url || !/^(file:|libsql:\/\/|https:\/\/)/.test(url)) {
    throw new Error('Dedicated AUTH_DATABASE_URL is required');
  }
  if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && url.startsWith('file:')) {
    throw new Error('Production authentication requires a shared remote database');
  }
  if (url === process.env.DATABASE_URL) throw new Error('Authentication database must be separate');
  const client = createClient({ url, authToken });
  const execute = (sql, args = []) => client.execute({ sql, args });

  return {
    async createChallenge(ttlSeconds = 300) {
      const token = crypto.randomBytes(32).toString('base64url');
      await execute(
        'INSERT INTO admin_sessions (token_hash, scope, credential_version, expires_at) VALUES (?, ?, ?, ?)',
        [hash(token), 'challenge', credentialVersion, now() + ttlSeconds * 1000]
      );
      return token;
    },
    async find(token, scope) {
      if (!validToken(token)) return null;
      const result = await execute(
        'SELECT scope, expires_at FROM admin_sessions WHERE token_hash = ? AND scope = ? AND credential_version = ? AND expires_at > ?',
        [hash(token), scope, credentialVersion, now()]
      );
      return result.rows[0] || null;
    },
    async revoke(...tokens) {
      const hashes = tokens.filter(validToken).map(hash);
      if (!hashes.length) return;
      await execute(`DELETE FROM admin_sessions WHERE token_hash IN (${hashes.map(() => '?').join(',')})`, hashes);
    },
    async takeLimit(key, maximum, windowSeconds) {
      // One atomic statement; shared by all instances. Increment before verifying.
      const time = now();
      const result = await execute(`
        INSERT INTO admin_login_limits (bucket_key, attempts, resets_at) VALUES (?, 1, ?)
        ON CONFLICT(bucket_key) DO UPDATE SET
          attempts = CASE WHEN admin_login_limits.resets_at <= ? THEN 1 ELSE admin_login_limits.attempts + 1 END,
          resets_at = CASE WHEN admin_login_limits.resets_at <= ? THEN excluded.resets_at ELSE admin_login_limits.resets_at END
        RETURNING attempts, resets_at`, [key, time + windowSeconds * 1000, time, time]);
      const row = result.rows[0];
      return { allowed: Number(row.attempts) <= maximum, retryAfter: Math.max(1, Math.ceil((Number(row.resets_at) - time) / 1000)) };
    },
    async completeChallenge(token, totpStep, ttlSeconds = 12 * 60 * 60) {
      if (!validToken(token)) return null;
      const time = now();
      const session = crypto.randomBytes(32).toString('base64url');
      const challengeHash = hash(token);
      const sessionHash = hash(session);
      // batch(..., 'write') executes on one connection in an atomic write transaction.
      // Conditional SQL ties replay protection, session issuance and consumption together.
      const result = await client.batch([
        {
          sql: `INSERT INTO admin_totp_replay (credential_version, last_step)
                SELECT ?, ? WHERE EXISTS (
                  SELECT 1 FROM admin_sessions WHERE token_hash = ? AND scope = 'challenge'
                  AND credential_version = ? AND expires_at > ?)
                ON CONFLICT(credential_version) DO UPDATE SET last_step = excluded.last_step
                WHERE admin_totp_replay.last_step < excluded.last_step RETURNING last_step`,
          args: [credentialVersion, totpStep, challengeHash, credentialVersion, time]
        },
        {
          sql: `INSERT INTO admin_sessions (token_hash, scope, credential_version, expires_at)
                SELECT ?, 'admin', ?, ? WHERE changes() = 1 AND EXISTS (
                  SELECT 1 FROM admin_sessions WHERE token_hash = ? AND scope = 'challenge'
                  AND credential_version = ? AND expires_at > ?)`,
          args: [sessionHash, credentialVersion, time + ttlSeconds * 1000, challengeHash, credentialVersion, time]
        },
        {
          sql: `DELETE FROM admin_sessions WHERE token_hash = ? AND scope = 'challenge'
                AND EXISTS (SELECT 1 FROM admin_sessions WHERE token_hash = ? AND scope = 'admin')`,
          args: [challengeHash, sessionHash]
        }
      ], 'write');
      return result[1].rowsAffected === 1 ? session : null;
    },
    close() { client.close(); }
  };
}

module.exports = { createAuthStore, hash, validToken };
