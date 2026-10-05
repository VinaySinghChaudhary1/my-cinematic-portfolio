/** Plain SQL so the same bootstrap runs on local SQLite files and on Turso without extra tooling. */
export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT 'Admin',
    password_hash TEXT NOT NULL, session_version INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until INTEGER, last_login_at INTEGER,
    created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sections (
    key TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1, show_in_nav INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
    config TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY, section_key TEXT NOT NULL, data TEXT NOT NULL,
    visible INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS items_section_idx ON items(section_key, sort_order)`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY, url TEXT NOT NULL, storage_key TEXT NOT NULL, filename TEXT NOT NULL,
    mime TEXT NOT NULL, size INTEGER NOT NULL, alt TEXT NOT NULL DEFAULT '', folder TEXT NOT NULL DEFAULT 'general',
    created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL,
    protected INTEGER NOT NULL DEFAULT 0, summary TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY, provider TEXT NOT NULL, model TEXT NOT NULL, task TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL, error TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage(created_at)`,
  `CREATE TABLE IF NOT EXISTS testers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, can_see_drafts INTEGER NOT NULL DEFAULT 1,
    note TEXT NOT NULL DEFAULT '', expires_at INTEGER, revoked_at INTEGER, session_version INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until INTEGER, last_seen_at INTEGER, google_sub TEXT,
    created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, subject_id TEXT NOT NULL, purpose TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL)`,
];

/**
 * Columns added after the first release. SQLite has no "ADD COLUMN IF NOT EXISTS", so each statement
 * is tried once per cold start and a "duplicate column" error simply means it already ran.
 */
export const COLUMN_MIGRATIONS: string[] = [
  `ALTER TABLE users ADD COLUMN google_sub TEXT`,
  `ALTER TABLE users ADD COLUMN google_email TEXT`,
  `ALTER TABLE sections ADD COLUMN audience TEXT NOT NULL DEFAULT 'public'`,
  `ALTER TABLE items ADD COLUMN status TEXT NOT NULL DEFAULT 'published'`,
  `ALTER TABLE items ADD COLUMN publish_at INTEGER`,
];
