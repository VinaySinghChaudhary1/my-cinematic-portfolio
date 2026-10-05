/**
 * Backup & restore engine — pure server code (no Next.js request APIs), shared by the admin API,
 * the scheduler and the `npm run backup` / `npm run restore` scripts.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema, client } from "@/db";
import { SETTINGS_GROUPS, DEFAULT_SETTINGS } from "@/lib/settings-def";
import { parseContent, collectAssets, itemMeta, type ImportedContent } from "@/lib/content-import";
import { APP_VERSION } from "@/lib/version";
import { newId } from "../ids";
import { detectType, storeFile, readStoredFile, putPrivate, getPrivate, deletePrivate, EXT_TO_MIME } from "../storage";
import { buildArchive, readArchive, DEFAULT_BACKUP_OPTIONS, type BackupOptions, type ReadArchive, type Manifest } from "./archive";
import { encryptAtRest, decryptAtRest, decryptWithPassword, encryptWithPassword, isEncrypted, encryptionKind, BackupCryptoError } from "./crypto";

export type BackupKind = "manual" | "scheduled" | "pre-restore" | "uploaded" | "cli";

export class BackupError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details: string[] = [],
  ) {
    super(message);
  }
}

export interface BackupSummary {
  formatVersion?: number;
  appVersion?: string;
  options?: BackupOptions;
  counts?: Manifest["counts"];
  warnings?: string[];
  siteUrl?: string;
  createdAt?: string;
}

const GROUP_KEYS = new Set(SETTINGS_GROUPS.map((g) => g.key));
const objectName = (id: string) => `backups/${id}.bin`;
const parse = <T>(s: string, fallback: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

// ─────────────────────────── locks (work across serverless instances) ───────────────────────────
/** Acquires a named lock stored in the settings table; returns a release function, or null if someone else holds it. */
export async function acquireLock(name: string, ttlMs: number): Promise<(() => Promise<void>) | null> {
  const key = `lock:${name}`;
  const token = newId();
  const t = Date.now();
  const res = await client.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at WHERE settings.updated_at < ?`,
    args: [key, token, t + ttlMs, t],
  });
  if (res.rowsAffected === 0) return null;
  return async () => {
    await client.execute({ sql: `DELETE FROM settings WHERE key = ? AND value = ?`, args: [key, token] });
  };
}

// ─────────────────────────── collecting ───────────────────────────
async function readBundled(asset: string, origin?: string): Promise<Uint8Array | null> {
  const rel = decodeURI(asset).replace(/^\/+/, "");
  if (rel.includes("..")) return null;
  for (const base of [path.join(/*turbopackIgnore: true*/ process.cwd(), "public"), path.join(/*turbopackIgnore: true*/ process.cwd(), ".next", "standalone", "public")]) {
    try {
      return new Uint8Array(await fs.readFile(/*turbopackIgnore: true*/ path.join(base, rel)));
    } catch {
      /* try next */
    }
  }
  const site = origin || process.env.SITE_URL;
  if (site) {
    try {
      const res = await fetch(new URL(asset, site));
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
    } catch {
      /* unreachable */
    }
  }
  return null;
}

async function bundledExists(asset: string, origin?: string): Promise<boolean> {
  const rel = decodeURI(asset).replace(/^\/+/, "");
  try {
    await fs.access(/*turbopackIgnore: true*/ path.join(process.cwd(), "public", rel));
    return true;
  } catch {
    /* fall through */
  }
  const site = origin || process.env.SITE_URL;
  if (!site) return false;
  try {
    const res = await fetch(new URL(asset, site), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function extFor(mime: string, filename: string): string {
  const fromMime = Object.entries(EXT_TO_MIME).find(([, m]) => m === mime)?.[0];
  return fromMime || filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
}

/** Current site content in content-file shape (also used for previews). */
export async function currentContent(sectionsFilter: BackupOptions["sections"] = "all", includeSettings = true) {
  const settingsRows = includeSettings ? await db.select().from(schema.settings) : [];
  const settings: Record<string, unknown> = {};
  for (const r of settingsRows) if (GROUP_KEYS.has(r.key)) settings[r.key] = parse(r.value, {});
  const secs = (await db.select().from(schema.sections).orderBy(asc(schema.sections.sortOrder))).filter(
    (s) => sectionsFilter === "all" || sectionsFilter.includes(s.key),
  );
  const items = await db.select().from(schema.items).orderBy(asc(schema.items.sortOrder), asc(schema.items.createdAt));
  return {
    settings,
    sections: secs.map((s) => ({
      key: s.key,
      type: s.type,
      title: s.title,
      subtitle: s.subtitle,
      enabled: s.enabled,
      showInNav: s.showInNav,
      ...(s.audience === "beta" ? { audience: "beta" } : {}),
      config: parse(s.config, {}),
      items: items
        .filter((i) => i.sectionKey === s.key)
        .map((i) => ({ ...itemMeta(i), ...parse<Record<string, unknown>>(i.data, {}) })),
    })),
  };
}

export async function collectBackup(options: BackupOptions, origin?: string) {
  const warnings: string[] = [];
  const files: Record<string, Uint8Array> = {};
  const wantSections = options.sections === "all" || options.sections.length > 0;
  const content = wantSections || options.settings ? await currentContent(wantSections ? options.sections : [], options.settings) : undefined;

  let media: Record<string, unknown>[] | undefined;
  if (options.media) {
    media = [];
    for (const row of await db.select().from(schema.media)) {
      const bytes = await readStoredFile(row.storageKey, row.url);
      if (!bytes) {
        warnings.push(`Media file missing in storage, skipped: ${row.filename}`);
        continue;
      }
      const file = `media/${row.id}.${extFor(row.mime, row.filename)}`;
      files[file] = bytes;
      media.push({ ...row, file });
    }
  }

  let bundledCount = 0;
  if (options.bundled && content) {
    const assets = new Set<string>();
    collectAssets(content, assets);
    for (const a of assets) {
      const bytes = await readBundled(a, origin);
      const p = `bundled${decodeURI(a)}`;
      if (!bytes) warnings.push(`Bundled file not found, skipped: ${a}`);
      else if (!/^bundled\/[A-Za-z0-9][A-Za-z0-9._\-/]{0,240}$/.test(p)) warnings.push(`Unusual file name, skipped: ${a}`);
      else {
        files[p] = bytes;
        bundledCount++;
      }
    }
  }

  const messages = options.messages ? await db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)) : undefined;
  const audit = options.audit ? await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(5000) : undefined;

  const counts = {
    sections: content?.sections.length ?? 0,
    items: content?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0,
    settings: Object.keys(content?.settings ?? {}).length,
    media: media?.length ?? 0,
    bundled: bundledCount,
    messages: messages?.length ?? 0,
    audit: audit?.length ?? 0,
  };
  return { parts: { content, media, messages, audit, files }, counts, warnings };
}

// ─────────────────────────── records & storage ───────────────────────────
export async function listBackups() {
  const rows = await db.select().from(schema.backups).orderBy(desc(schema.backups.createdAt));
  return rows.map((r) => ({ ...r, summary: parse<BackupSummary>(r.summary, {}) }));
}

export async function getBackupRecord(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [r] = await db.select().from(schema.backups).where(eq(schema.backups.id, id)).limit(1);
  return r ? { ...r, summary: parse<BackupSummary>(r.summary, {}) } : null;
}

async function saveRecord(kind: BackupKind, label: string, fileBytes: Uint8Array, prot: boolean, summary: BackupSummary) {
  const id = newId();
  await putPrivate(objectName(id), await encryptAtRest(fileBytes));
  const row = { id, kind, label: label.slice(0, 120), size: fileBytes.byteLength, protected: prot, summary: JSON.stringify(summary), createdAt: Date.now() };
  await db.insert(schema.backups).values(row);
  return { ...row, summary };
}

export async function deleteBackup(id: string) {
  await deletePrivate(objectName(id));
  await db.delete(schema.backups).where(eq(schema.backups.id, id));
}

/** Keeps the newest `keep` backups of a kind and deletes older ones. */
export async function pruneBackups(kind: BackupKind, keep: number) {
  const rows = await db.select().from(schema.backups).where(eq(schema.backups.kind, kind)).orderBy(desc(schema.backups.createdAt));
  for (const r of rows.slice(Math.max(0, keep))) await deleteBackup(r.id);
}

/** Creates a backup, keeps an encrypted copy on the server and returns its record. */
export async function createBackup(opts: { kind: BackupKind; label?: string; options?: Partial<BackupOptions>; origin?: string }) {
  const options: BackupOptions = { ...DEFAULT_BACKUP_OPTIONS, ...(opts.options ?? {}) };
  const { parts, counts, warnings } = await collectBackup(options, opts.origin);
  const createdAt = new Date().toISOString();
  const siteUrl = opts.origin || process.env.SITE_URL || "";
  const zip = buildArchive({ appVersion: APP_VERSION, createdAt, siteUrl, kind: opts.kind, label: opts.label ?? "", options, counts, warnings }, parts);
  // Test-read what we just wrote — a backup that can't be read back is worse than none.
  readArchive(zip);
  const record = await saveRecord(opts.kind, opts.label ?? "", zip, false, {
    formatVersion: 1,
    appVersion: APP_VERSION,
    options,
    counts,
    warnings,
    siteUrl,
    createdAt,
  });
  if (opts.kind === "pre-restore") await pruneBackups("pre-restore", 10);
  return record;
}

/** Stores a file the admin uploaded (plain .zip or password-encrypted). Plain zips are fully verified immediately. */
export async function storeUploadedBackup(bytes: Uint8Array, label: string) {
  const kind = encryptionKind(bytes);
  if (kind === "server") throw new BackupError("This is a server-only copy from another site. Download it from that site's Backups page instead.");
  if (kind === "password") return saveRecord("uploaded", label, bytes, true, {});
  const archive = readArchive(bytes);
  const m = archive.manifest;
  return saveRecord("uploaded", label, bytes, false, {
    formatVersion: m.formatVersion,
    appVersion: m.appVersion,
    options: m.options,
    counts: m.counts,
    warnings: m.warnings,
    siteUrl: m.siteUrl,
    createdAt: m.createdAt,
  });
}

/** The file exactly as it would be downloaded (zip, or password-encrypted zip). */
async function loadStoredFile(id: string): Promise<Uint8Array> {
  const enc = await getPrivate(objectName(id));
  if (!enc) throw new BackupError("The backup file is missing from storage.", 404);
  try {
    return await decryptAtRest(enc);
  } catch (e) {
    throw new BackupError(e instanceof Error ? e.message : "Backup can't be read.", 500);
  }
}

/** Opens a stored backup (asks for the password if it is protected) and verifies it. */
export async function openBackup(id: string, password?: string): Promise<ReadArchive> {
  const rec = await getBackupRecord(id);
  if (!rec) throw new BackupError("Backup not found.", 404);
  let bytes = await loadStoredFile(id);
  if (isEncrypted(bytes)) {
    try {
      bytes = await decryptWithPassword(bytes, password ?? "");
    } catch (e) {
      if (e instanceof BackupCryptoError) throw new BackupError(e.message, e.code === "wrong_password" ? 401 : 400);
      throw e;
    }
  }
  try {
    return readArchive(bytes);
  } catch (e) {
    throw new BackupError(e instanceof Error ? e.message : "Backup is damaged.");
  }
}

/** Bytes for a download: the stored file, optionally wrapped with a password the admin chooses now. */
export async function exportBackupFile(id: string, password?: string) {
  const rec = await getBackupRecord(id);
  if (!rec) throw new BackupError("Backup not found.", 404);
  const bytes = await loadStoredFile(id);
  if (rec.protected || !password) return { bytes, encrypted: rec.protected, record: rec };
  return { bytes: await encryptWithPassword(bytes, password), encrypted: true, record: rec };
}

// ─────────────────────────── preview ───────────────────────────
export async function previewRestore(archive: ReadArchive, origin?: string) {
  const backupSections = (archive.content?.sections ?? []) as { key: string; type: string; title: string; items?: unknown[]; enabled?: boolean }[];
  const cur = await currentContent("all", false);
  const curMap = new Map(cur.sections.map((s) => [s.key, s]));
  const mediaIds = new Set((await db.select({ id: schema.media.id }).from(schema.media)).map((m) => m.id));
  const msgIds = new Set((await db.select({ id: schema.messages.id }).from(schema.messages)).map((m) => m.id));
  const bundledAssets = Object.keys(archive.files).filter((p) => p.startsWith("bundled/")).map((p) => p.slice("bundled".length));
  let bundledMissing = 0;
  for (const a of bundledAssets.slice(0, 300)) if (!(await bundledExists(a, origin))) bundledMissing++;
  return {
    manifest: {
      createdAt: archive.manifest.createdAt,
      appVersion: archive.manifest.appVersion,
      siteUrl: archive.manifest.siteUrl,
      kind: archive.manifest.kind,
      label: archive.manifest.label,
      counts: archive.manifest.counts,
      warnings: archive.manifest.warnings ?? [],
    },
    sections: backupSections.map((s) => ({
      key: s.key,
      type: s.type,
      title: s.title,
      backupItems: Array.isArray(s.items) ? s.items.length : 0,
      currentItems: curMap.get(s.key)?.items.length ?? null,
      enabled: s.enabled !== false,
    })),
    removedIfAll: cur.sections.filter((s) => !backupSections.some((b) => b.key === s.key)).map((s) => ({ key: s.key, title: s.title })),
    settingsGroups: Object.keys(archive.content?.settings ?? {}),
    media: { total: archive.media.length, alreadyHere: archive.media.filter((m) => mediaIds.has(String(m.id))).length },
    bundled: { total: bundledAssets.length, missingHere: bundledMissing },
    messages: { total: archive.messages.length, new: archive.messages.filter((m) => !msgIds.has(String(m.id))).length },
  };
}

// ─────────────────────────── restore ───────────────────────────
export interface RestoreScope {
  sections: "all" | string[];
  settings: boolean;
  media: boolean;
  messages: boolean;
}

const asStr = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

function selectContent(archive: ReadArchive, scope: RestoreScope) {
  const raw = archive.content ?? {};
  const sections = Array.isArray(raw.sections) ? (raw.sections as Record<string, unknown>[]) : [];
  return {
    settings: scope.settings && raw.settings ? Object.fromEntries(Object.entries(raw.settings).filter(([k]) => GROUP_KEYS.has(k) && k !== "maintenance")) : undefined,
    sections: scope.sections === "all" ? sections : sections.filter((s) => (scope.sections as string[]).includes(String(s.key))),
  };
}

function validate(input: unknown): ImportedContent {
  const r = parseContent(input);
  if (!r.ok) throw new BackupError("The backup's content does not pass validation — nothing was changed.", 400, r.errors.slice(0, 30));
  return r.content;
}

export async function restoreBackup(archive: ReadArchive, scope: RestoreScope, opts: { origin?: string; actorId?: string | null } = {}) {
  const release = await acquireLock("restore", 10 * 60_000);
  if (!release) throw new BackupError("Another restore is already running. Try again in a few minutes.", 409);
  const warnings: string[] = [];
  const report = { snapshotId: "", sections: 0, items: 0, settingsGroups: 0, mediaAdded: 0, mediaReused: 0, bundledUploaded: 0, messagesAdded: 0, warnings };
  let maintenanceBefore: string | null = null;
  let maintenanceTouched = false;
  try {
    // 1 · validate first, before touching anything
    const selected = selectContent(archive, scope);
    validate(selected);

    // 2 · safety snapshot of the current site (content + settings)
    const snap = await createBackup({ kind: "pre-restore", label: "Automatic snapshot before restore", options: { sections: "all", settings: true, media: false, bundled: false, messages: false, audit: false }, origin: opts.origin });
    report.snapshotId = snap.id;

    // 3 · maintenance mode while we work
    const [mRow] = await db.select().from(schema.settings).where(eq(schema.settings.key, "maintenance")).limit(1);
    maintenanceBefore = mRow?.value ?? null;
    const m = { ...DEFAULT_SETTINGS.maintenance, ...parse(mRow?.value ?? "{}", {}), enabled: true, message: "We're updating the site — back in a minute." };
    await db
      .insert(schema.settings)
      .values({ key: "maintenance", value: JSON.stringify(m), updatedAt: Date.now() })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: JSON.stringify(m), updatedAt: Date.now() } });
    maintenanceTouched = true;

    // 4 · media files → storage (before the DB transaction; orphans are harmless if a later step fails)
    const urlMap = new Map<string, string>();
    const newMedia: (typeof schema.media.$inferInsert)[] = [];
    if (scope.media) {
      const current = new Map((await db.select().from(schema.media)).map((r) => [r.id, r]));
      for (const rec of archive.media) {
        const id = asStr(rec.id, 64);
        const oldUrl = asStr(rec.url);
        const here = current.get(id);
        if (here) {
          if (oldUrl && oldUrl !== here.url) urlMap.set(oldUrl, here.url);
          report.mediaReused++;
          continue;
        }
        const bytes = archive.files[asStr(rec.file, 300)];
        const type = bytes ? detectType(bytes) : null;
        if (!bytes || !type) {
          warnings.push(`Skipped media "${asStr(rec.filename, 80)}" (file missing or not an allowed type).`);
          continue;
        }
        const stored = await storeFile(bytes, type.ext, type.mime, asStr(rec.folder, 30) || "restored");
        if (oldUrl) urlMap.set(oldUrl, stored.url);
        newMedia.push({
          id: /^[0-9a-f-]{36}$/.test(id) ? id : newId(),
          url: stored.url,
          storageKey: stored.storageKey,
          filename: asStr(rec.filename, 120).replace(/[^\w.\- ()]/g, "_") || `restored.${type.ext}`,
          mime: type.mime,
          size: bytes.byteLength,
          alt: asStr(rec.alt, 300),
          folder: asStr(rec.folder, 30) || "general",
          createdAt: typeof rec.createdAt === "number" ? rec.createdAt : Date.now(),
        });
        report.mediaAdded++;
      }
    }

    // 5 · bundled files (/me/…) that this deployment doesn't ship → upload them and point content at the copies
    const assets = new Set<string>();
    collectAssets(selected, assets);
    for (const a of assets) {
      if (await bundledExists(a, opts.origin)) continue;
      const bytes = archive.files[`bundled${decodeURI(a)}`];
      const type = bytes ? detectType(bytes) : null;
      if (!bytes || !type) {
        warnings.push(`${a} is not part of this deployment and could not be re-uploaded${bytes ? " (type not allowed for uploads)" : ""}.`);
        continue;
      }
      const stored = await storeFile(bytes, type.ext, type.mime, "restored");
      urlMap.set(a, stored.url);
      newMedia.push({ id: newId(), url: stored.url, storageKey: stored.storageKey, filename: a.split("/").pop()!.slice(0, 120), mime: type.mime, size: bytes.byteLength, alt: "", folder: "restored", createdAt: Date.now() });
      report.bundledUploaded++;
    }

    // 6 · rewrite old file URLs, then validate again
    let text = JSON.stringify(selected);
    for (const [from, to] of [...urlMap.entries()].sort((x, y) => y[0].length - x[0].length)) text = text.split(JSON.stringify(from).slice(1, -1)).join(JSON.stringify(to).slice(1, -1));
    const content = validate(JSON.parse(text));

    // 7 · one transaction: either everything lands or nothing changes
    const msgs = scope.messages
      ? archive.messages
          .filter((x) => asStr(x.id, 64) && asStr(x.email, 254) && asStr(x.body, 5000))
          .map((x) => ({
            id: asStr(x.id, 64),
            name: asStr(x.name, 120) || "Unknown",
            email: asStr(x.email, 254),
            subject: asStr(x.subject, 200),
            body: asStr(x.body, 5000),
            read: x.read === true,
            createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
          }))
      : [];
    const t = Date.now();
    await db.transaction(async (tx) => {
      for (const row of newMedia) await tx.insert(schema.media).values(row).onConflictDoNothing();
      const existing = await tx.select().from(schema.sections);
      let nextOrder = existing.reduce((n, s) => Math.max(n, s.sortOrder + 1), 0);
      if (scope.sections === "all") {
        await tx.delete(schema.items);
        await tx.delete(schema.sections);
        nextOrder = 0;
      }
      for (const s of content.sections) {
        const prev = existing.find((e) => e.key === s.key);
        if (scope.sections !== "all") {
          await tx.delete(schema.items).where(eq(schema.items.sectionKey, s.key));
          await tx.delete(schema.sections).where(eq(schema.sections.key, s.key));
        }
        const sortOrder = scope.sections !== "all" && prev ? prev.sortOrder : nextOrder++;
        await tx.insert(schema.sections).values({ key: s.key, type: s.type, title: s.title, subtitle: s.subtitle, enabled: s.enabled, showInNav: s.showInNav, audience: s.audience, sortOrder, config: JSON.stringify(s.config), updatedAt: t });
        let i = 0;
        for (const it of s.items) {
          await tx.insert(schema.items).values({ id: newId(), sectionKey: s.key, data: JSON.stringify(it.data), visible: it.visible, featured: it.featured, status: it.status, publishAt: it.publishAt, sortOrder: i, createdAt: t + i, updatedAt: t + i });
          i++;
        }
        report.sections++;
        report.items += s.items.length;
      }
      for (const [group, value] of Object.entries(content.settings)) {
        const merged = JSON.stringify({ ...((DEFAULT_SETTINGS as unknown as Record<string, object>)[group] ?? {}), ...value });
        await tx.insert(schema.settings).values({ key: group, value: merged, updatedAt: t }).onConflictDoUpdate({ target: schema.settings.key, set: { value: merged, updatedAt: t } });
        report.settingsGroups++;
      }
      for (const msg of msgs) {
        const r = await tx.insert(schema.messages).values(msg).onConflictDoNothing();
        if (r.rowsAffected) report.messagesAdded++;
      }
    });
    if (opts.actorId !== undefined) {
      await db.insert(schema.auditLog).values({ id: newId(), userId: opts.actorId, action: "backup_restored", detail: `${report.sections} sections, ${report.items} items, ${report.mediaAdded} media added`, ip: "", createdAt: Date.now() });
    }
    return report;
  } finally {
    // put maintenance mode back exactly as it was
    if (maintenanceTouched) {
      if (maintenanceBefore !== null) await db.update(schema.settings).set({ value: maintenanceBefore, updatedAt: Date.now() }).where(eq(schema.settings.key, "maintenance"));
      else await db.delete(schema.settings).where(eq(schema.settings.key, "maintenance"));
    }
    await release();
  }
}
