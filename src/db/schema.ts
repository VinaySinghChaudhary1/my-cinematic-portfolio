import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/** Admin accounts. The site is single-owner, but the table supports more than one admin. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default("Admin"),
  passwordHash: text("password_hash").notNull(),
  /** Incremented to invalidate every existing session ("log out everywhere", password change). */
  sessionVersion: integer("session_version").notNull().default(1),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  lastLoginAt: integer("last_login_at"),
  createdAt: integer("created_at").notNull(),
  /** Linked Google account (OpenID `sub`) — enables "Continue with Google" for this admin. */
  googleSub: text("google_sub"),
  googleEmail: text("google_email"),
});

/** Beta testers: may view the site during maintenance and beta-only sections. Never admins. */
export const testers = sqliteTable("testers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  canSeeDrafts: integer("can_see_drafts", { mode: "boolean" }).notNull().default(true),
  note: text("note").notNull().default(""),
  expiresAt: integer("expires_at"),
  revokedAt: integer("revoked_at"),
  sessionVersion: integer("session_version").notNull().default(1),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  lastSeenAt: integer("last_seen_at"),
  googleSub: text("google_sub"),
  createdAt: integer("created_at").notNull(),
});

/** One-time tokens (password reset). Only a SHA-256 hash of the token is stored. */
export const authTokens = sqliteTable("auth_tokens", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // admin | tester
  subjectId: text("subject_id").notNull(),
  purpose: text("purpose").notNull(), // reset
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull(),
});

/** Key/value JSON settings (site profile, SEO, theme, maintenance, legal pages…). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** Every portfolio section. `enabled` is the on/off switch shown in the admin panel. */
export const sections = sqliteTable("sections", {
  key: text("key").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  showInNav: integer("show_in_nav", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  config: text("config").notNull().default("{}"),
  /** public = everyone · beta = only beta testers and the admin (test a new section before launch). */
  audience: text("audience").notNull().default("public"),
  updatedAt: integer("updated_at").notNull(),
});

/** Content entries belonging to a section (a project, a certificate, a skill…). Fields live in `data` (JSON). */
export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    sectionKey: text("section_key").notNull(),
    data: text("data").notNull(),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    /** draft = never public · published = public from `publishAt` (null = now). */
    status: text("status").notNull().default("published"),
    publishAt: integer("publish_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("items_section_idx").on(t.sectionKey, t.sortOrder)],
);

/** Uploaded files (photos, certificates, résumé…). */
export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  alt: text("alt").notNull().default(""),
  folder: text("folder").notNull().default("general"),
  createdAt: integer("created_at").notNull(),
});

/** Messages sent through the public contact form. */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

/** Fixed-window rate-limit counters (DB-backed so they work on serverless too). */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

/** Security / change history visible in Admin → Account. */
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  ip: text("ip").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

/** Backup archives kept on the server (the archive bytes live in private storage, encrypted at rest). */
export const backups = sqliteTable("backups", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // manual | scheduled | pre-restore | uploaded | cli
  label: text("label").notNull().default(""),
  size: integer("size").notNull(),
  protected: integer("protected", { mode: "boolean" }).notNull().default(false), // file itself is password-encrypted
  summary: text("summary").notNull().default("{}"), // JSON: counts, options, appVersion, formatVersion
  createdAt: integer("created_at").notNull(),
});

/** One row per AI request (Admin → AI usage). Prompts and keys are never stored. */
export const aiUsage = sqliteTable("ai_usage", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  task: text("task").notNull(), // fill | text | image | logo | test
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  ok: integer("ok", { mode: "boolean" }).notNull(),
  error: text("error").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export type BackupRow = typeof backups.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type TesterRow = typeof testers.$inferSelect;
export type SectionRow = typeof sections.$inferSelect;
export type ItemRow = typeof items.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
