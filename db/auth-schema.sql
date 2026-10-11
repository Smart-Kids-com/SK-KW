-- Apply explicitly to a dedicated authentication database, never the store DB.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('challenge', 'admin')),
  credential_version TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_login_limits (
  bucket_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  resets_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_totp_replay (
  credential_version TEXT PRIMARY KEY,
  last_step INTEGER NOT NULL
);
