/**
 * Backup archive format (a normal .zip anyone can open):
 *
 *   manifest.json   format, versions, options, counts, SHA-256 of every other file
 *   content.json    { settings: {group: {...}}, sections: [{ key, type, ..., items: [{ featured, visible, ...fields }] }] }
 *                   — the same shape as content/vinay.json, so `npm run content:apply` can read it too
 *   media.json      media library records, each pointing to media/<file>
 *   media/…         uploaded images / PDFs
 *   bundled/…       files shipped with the code that the content references (/me/…, /demo/…)
 *   messages.json   contact messages (optional)
 *   audit.json      admin activity log (optional)
 */
import { zipSync, unzipSync, strToU8, strFromU8, type Zippable } from "fflate";
import { sha256 } from "./crypto";

export const BACKUP_FORMAT = "cinematic-portfolio-backup";
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupOptions {
  /** "all" or a list of section keys to include. An empty list = no sections. */
  sections: "all" | string[];
  settings: boolean;
  media: boolean;
  bundled: boolean;
  messages: boolean;
  audit: boolean;
}

export const DEFAULT_BACKUP_OPTIONS: BackupOptions = { sections: "all", settings: true, media: true, bundled: true, messages: false, audit: false };

export interface Manifest {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  appVersion: string;
  createdAt: string;
  siteUrl: string;
  kind: string;
  label: string;
  options: BackupOptions;
  counts: { sections: number; items: number; settings: number; media: number; bundled: number; messages: number; audit: number };
  files: Record<string, { size: number; sha256: string }>;
  warnings: string[];
}

export interface ArchiveParts {
  content?: unknown;
  media?: unknown[];
  messages?: unknown[];
  audit?: unknown[];
  /** path inside the zip (media/…, bundled/…) → bytes */
  files: Record<string, Uint8Array>;
}

// Already-compressed formats are stored, not deflated again (faster, same size).
const STORE_EXT = /\.(jpe?g|png|webp|gif|avif|pdf|mp4|webm|zip|woff2?)$/i;

export function buildArchive(meta: Omit<Manifest, "files" | "format" | "formatVersion">, parts: ArchiveParts): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  if (parts.content !== undefined) entries["content.json"] = strToU8(JSON.stringify(parts.content, null, 2));
  if (parts.media) entries["media.json"] = strToU8(JSON.stringify(parts.media, null, 2));
  if (parts.messages) entries["messages.json"] = strToU8(JSON.stringify(parts.messages, null, 2));
  if (parts.audit) entries["audit.json"] = strToU8(JSON.stringify(parts.audit, null, 2));
  for (const [p, bytes] of Object.entries(parts.files)) {
    if (!isAllowedEntry(p)) throw new Error(`Refusing to add unsafe path to backup: ${p}`);
    entries[p] = bytes;
  }
  const files: Manifest["files"] = {};
  for (const [p, bytes] of Object.entries(entries)) files[p] = { size: bytes.byteLength, sha256: sha256(bytes) };
  const manifest: Manifest = { format: BACKUP_FORMAT, formatVersion: BACKUP_FORMAT_VERSION, ...meta, files };

  const zippable: Zippable = { "manifest.json": [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }] };
  for (const [p, bytes] of Object.entries(entries)) zippable[p] = [bytes, { level: STORE_EXT.test(p) ? 0 : 6 }];
  return zipSync(zippable, { mtime: new Date() });
}

// ─────────────────────────── reading (untrusted input) ───────────────────────────
export const LIMITS = {
  maxEntries: 5000,
  maxEntryBytes: 120 * 1024 * 1024,
  maxTotalBytes: 1024 * 1024 * 1024,
  maxRatio: 200,
};

const ENTRY = /^(manifest\.json|content\.json|media\.json|messages\.json|audit\.json|(media|bundled)\/[A-Za-z0-9][A-Za-z0-9._\-/]{0,240})$/;

export function isAllowedEntry(p: string): boolean {
  return ENTRY.test(p) && !p.includes("..") && !p.includes("//") && !p.endsWith("/");
}

export class ArchiveError extends Error {}

export interface ReadArchive {
  manifest: Manifest;
  content: { settings?: Record<string, Record<string, unknown>>; sections?: unknown[] } | null;
  media: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  audit: Record<string, unknown>[];
  files: Record<string, Uint8Array>;
}

/** Unzips with strict limits, then verifies every checksum against the manifest. Throws ArchiveError on any problem. */
export function readArchive(zip: Uint8Array): ReadArchive {
  if (zip[0] !== 0x50 || zip[1] !== 0x4b) throw new ArchiveError("This is not a backup file (expected a .zip).");
  let count = 0;
  let total = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zip, {
      filter(f) {
        if (f.name.endsWith("/")) return false; // folder entries
        if (++count > LIMITS.maxEntries) throw new ArchiveError("The backup contains too many files.");
        if (!isAllowedEntry(f.name)) throw new ArchiveError(`The backup contains an unexpected file: ${f.name.slice(0, 80)}`);
        if (f.originalSize > LIMITS.maxEntryBytes) throw new ArchiveError(`A file in the backup is too large: ${f.name.slice(0, 80)}`);
        total += f.originalSize;
        if (total > LIMITS.maxTotalBytes) throw new ArchiveError("The backup unpacks to more than 1 GB.");
        if (f.size > 0 && f.originalSize > 1_000_000 && f.originalSize / f.size > LIMITS.maxRatio)
          throw new ArchiveError("The backup looks like a zip bomb (suspicious compression ratio).");
        return true;
      },
    });
  } catch (e) {
    if (e instanceof ArchiveError) throw e;
    throw new ArchiveError("The backup file is damaged and can't be unzipped.");
  }

  const mf = entries["manifest.json"];
  if (!mf) throw new ArchiveError("manifest.json is missing — this is not a portfolio backup.");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(strFromU8(mf));
  } catch {
    throw new ArchiveError("manifest.json is not valid JSON.");
  }
  if (manifest.format !== BACKUP_FORMAT) throw new ArchiveError("This zip is not a portfolio backup.");
  if (typeof manifest.formatVersion !== "number" || manifest.formatVersion > BACKUP_FORMAT_VERSION)
    throw new ArchiveError(`This backup was made by a newer version of the site (format ${manifest.formatVersion}). Update the site first.`);

  for (const [p, bytes] of Object.entries(entries)) {
    if (p === "manifest.json") continue;
    const want = manifest.files?.[p];
    if (!want) throw new ArchiveError(`${p} is not listed in the manifest — the backup was modified.`);
    if (want.size !== bytes.byteLength || want.sha256 !== sha256(bytes)) throw new ArchiveError(`Checksum mismatch for ${p} — the backup is damaged or was modified.`);
  }
  for (const p of Object.keys(manifest.files ?? {})) if (!entries[p]) throw new ArchiveError(`${p} is missing from the backup.`);

  const json = <T>(p: string, fallback: T): T => {
    const b = entries[p];
    if (!b) return fallback;
    try {
      return JSON.parse(strFromU8(b)) as T;
    } catch {
      throw new ArchiveError(`${p} is not valid JSON.`);
    }
  };
  const files: Record<string, Uint8Array> = {};
  for (const [p, b] of Object.entries(entries)) if (p.startsWith("media/") || p.startsWith("bundled/")) files[p] = b;

  const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  return {
    manifest,
    content: json("content.json", null),
    media: arr(json("media.json", [])),
    messages: arr(json("messages.json", [])),
    audit: arr(json("audit.json", [])),
    files,
  };
}
