/**
 * Storage drivers — the same code runs on any host:
 *
 *   local  files on disk under DATA_DIR (default ./data) — VPS, Hostinger, Docker (mount a volume), Render/Railway disks
 *   blob   Vercel Blob (BLOB_READ_WRITE_TOKEN)                     — Vercel
 *   s3     any S3-compatible bucket (S3_BUCKET + keys)             — AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO…
 *
 * STORAGE_DRIVER picks one explicitly; otherwise: blob if BLOB_READ_WRITE_TOKEN, s3 if S3_BUCKET, else local.
 *
 * Two kinds of objects:
 *   - public media (photos, PDFs) → storeFile / deleteStoredFile / readStoredFile
 *   - private objects (backups, upload chunks) → putPrivate / getPrivate / deletePrivate (always encrypted by callers)
 */
import path from "node:path";
import fs from "node:fs/promises";
import { HttpError } from "./errors";
import { awsEncode, signRequest } from "./s3-sign";

/** Allowed upload types, detected from the file's real bytes ("magic numbers"), not the browser-supplied type. */
const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/gif", ext: "gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    mime: "image/avif",
    ext: "avif",
    test: (b) => String.fromCharCode(...b.slice(4, 12)) === "ftypavif" || String.fromCharCode(...b.slice(4, 12)) === "ftypavis",
  },
  { mime: "application/pdf", ext: "pdf", test: (b) => String.fromCharCode(...b.slice(0, 5)) === "%PDF-" },
];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_BYTES = 15 * 1024 * 1024;

export function detectType(bytes: Uint8Array): { mime: string; ext: string } | null {
  const sig = SIGNATURES.find((s) => s.test(bytes));
  return sig ? { mime: sig.mime, ext: sig.ext } : null;
}

export const EXT_TO_MIME: Record<string, string> = Object.fromEntries(SIGNATURES.map((s) => [s.ext, s.mime]));

/** Root for everything the app writes at runtime (SQLite file, uploads, private objects). */
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const PRIVATE_DIR = path.join(DATA_DIR, "private");

export type StorageDriver = "local" | "blob" | "s3";

export function storageDriver(): StorageDriver {
  const forced = (process.env.STORAGE_DRIVER || "").toLowerCase();
  if (forced === "local" || forced === "blob" || forced === "s3") return forced;
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.S3_BUCKET) return "s3";
  return "local";
}

/** True on hosts whose disk is wiped between deploys/invocations (local storage would silently lose files). */
export function isEphemeralHost(): boolean {
  return !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export interface Stored {
  url: string;
  storageKey: string;
}

// ─────────────────────────── S3-compatible ───────────────────────────
function s3() {
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION || "auto";
  const endpoint = (process.env.S3_ENDPOINT || `https://s3.${region === "auto" ? "us-east-1" : region}.amazonaws.com`).replace(/\/+$/, "");
  const pathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";
  const objectUrl = (key: string) => {
    const k = key.split("/").map((p) => awsEncode(p)).join("/");
    if (pathStyle) return `${endpoint}/${bucket}/${k}`;
    const u = new URL(endpoint);
    return `${u.protocol}//${bucket}.${u.host}/${k}`;
  };
  const client = {
    fetch(url: string, init: { method?: string; body?: Uint8Array; headers?: Record<string, string> } = {}) {
      const method = init.method ?? "GET";
      const headers = signRequest({ method, url, headers: init.headers, body: init.body, accessKeyId: process.env.S3_ACCESS_KEY_ID || "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "", region });
      return fetch(url, { method, headers, body: init.body ? Buffer.from(init.body) : undefined });
    },
  };
  return { client, objectUrl };
}

async function s3Put(key: string, bytes: Uint8Array, contentType: string) {
  const { client, objectUrl } = s3();
  const res = await client.fetch(objectUrl(key), { method: "PUT", body: bytes, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new HttpError(502, `File storage rejected the upload (S3 ${res.status}).`, "storage_error");
}
async function s3Get(key: string): Promise<Uint8Array | null> {
  const { client, objectUrl } = s3();
  const res = await client.fetch(objectUrl(key));
  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(502, `File storage read failed (S3 ${res.status}).`, "storage_error");
  return new Uint8Array(await res.arrayBuffer());
}
async function s3Delete(key: string) {
  const { client, objectUrl } = s3();
  await client.fetch(objectUrl(key), { method: "DELETE" });
}

function s3PublicUrl(key: string) {
  const base = (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "");
  if (!base) throw new HttpError(500, "S3_PUBLIC_URL is not set — media needs a public URL for the bucket.", "storage_unconfigured");
  return `${base}/${key}`;
}

// ─────────────────────────── public media ───────────────────────────
export async function storeFile(bytes: Uint8Array, ext: string, mime: string, folder: string): Promise<Stored> {
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "general";
  const name = `${crypto.randomUUID()}.${ext}`;
  const key = `${safeFolder}/${name}`;
  const driver = storageDriver();

  if (driver === "blob") {
    const { put } = await import("@vercel/blob");
    const blob = await put(`portfolio/${key}`, Buffer.from(bytes), { access: "public", contentType: mime, addRandomSuffix: false });
    return { url: blob.url, storageKey: blob.url };
  }
  if (driver === "s3") {
    await s3Put(`media/${key}`, bytes, mime);
    return { url: s3PublicUrl(`media/${key}`), storageKey: `s3:media/${key}` };
  }
  if (isEphemeralHost()) {
    throw new HttpError(
      500,
      "File storage is not configured for this host (its disk is temporary). Set BLOB_READ_WRITE_TOKEN or the S3_* variables.",
      "storage_unconfigured",
    );
  }
  const dir = path.join(UPLOAD_DIR, safeFolder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), bytes);
  return { url: `/media/${key}`, storageKey: key };
}

export async function deleteStoredFile(storageKey: string) {
  try {
    if (storageKey.startsWith("https://")) {
      const { del } = await import("@vercel/blob");
      await del(storageKey);
      return;
    }
    if (storageKey.startsWith("s3:")) {
      await s3Delete(storageKey.slice(3));
      return;
    }
    const full = resolveLocal(storageKey);
    if (full) await fs.unlink(full);
  } catch (e) {
    console.warn("[storage] delete failed (ignored)", e);
  }
}

/** Reads a stored media file's bytes (used by backups). Returns null when it no longer exists. */
export async function readStoredFile(storageKey: string, url?: string): Promise<Uint8Array | null> {
  try {
    if (storageKey.startsWith("s3:")) return await s3Get(storageKey.slice(3));
    if (storageKey.startsWith("https://") || (url && /^https:\/\//.test(url))) {
      const res = await fetch(storageKey.startsWith("https://") ? storageKey : url!);
      return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
    }
    const full = resolveLocal(storageKey);
    return full ? new Uint8Array(await fs.readFile(full)) : null;
  } catch {
    return null;
  }
}

/** Resolves a /media/<key> path to disk, refusing anything that escapes the upload dir. */
export function resolveLocal(key: string): string | null {
  if (!/^[a-z0-9-]+\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/i.test(key)) return null;
  const full = path.resolve(UPLOAD_DIR, key);
  if (!full.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return null;
  return full;
}

// ─────────────────────────── private objects ───────────────────────────
const PRIVATE_NAME = /^[a-z0-9][a-z0-9/_-]{0,180}(\.[a-z0-9]{1,8})?$/i;

function checkPrivateName(name: string) {
  if (!PRIVATE_NAME.test(name) || name.includes("..") || name.includes("//")) throw new Error(`Invalid private object name: ${name}`);
}

/**
 * Stores bytes that must never be served publicly. Callers encrypt the bytes first, so even a store that cannot
 * do private objects (a public Vercel Blob store) only ever holds ciphertext at an unguessable path.
 */
export async function putPrivate(name: string, bytes: Uint8Array): Promise<void> {
  checkPrivateName(name);
  const driver = storageDriver();
  if (driver === "blob") {
    const { put } = await import("@vercel/blob");
    const pathname = `portfolio-private/${name}`;
    try {
      await put(pathname, Buffer.from(bytes), { access: "private", contentType: "application/octet-stream", addRandomSuffix: false, allowOverwrite: true });
    } catch {
      // Older/public-only stores: fall back to a public object — contents are encrypted and the path is random.
      await put(pathname, Buffer.from(bytes), { access: "public", contentType: "application/octet-stream", addRandomSuffix: false, allowOverwrite: true });
    }
    return;
  }
  if (driver === "s3") return s3Put(`private/${name}`, bytes, "application/octet-stream");
  if (isEphemeralHost()) throw new HttpError(500, "Backup storage is not configured for this host. Set BLOB_READ_WRITE_TOKEN or the S3_* variables.", "storage_unconfigured");
  const full = path.join(PRIVATE_DIR, name);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes, { mode: 0o600 });
}

export async function getPrivate(name: string): Promise<Uint8Array | null> {
  checkPrivateName(name);
  const driver = storageDriver();
  if (driver === "blob") {
    const { get } = await import("@vercel/blob");
    for (const access of ["private", "public"] as const) {
      try {
        const r = await get(`portfolio-private/${name}`, { access, useCache: false });
        if (r && r.statusCode === 200) return new Uint8Array(await new Response(r.stream).arrayBuffer());
      } catch {
        /* try the other access mode */
      }
    }
    return null;
  }
  if (driver === "s3") return s3Get(`private/${name}`);
  try {
    return new Uint8Array(await fs.readFile(path.join(PRIVATE_DIR, name)));
  } catch {
    return null;
  }
}

export async function deletePrivate(name: string): Promise<void> {
  checkPrivateName(name);
  try {
    const driver = storageDriver();
    if (driver === "blob") {
      const { del, head } = await import("@vercel/blob");
      const meta = await head(`portfolio-private/${name}`).catch(() => null);
      if (meta) await del(meta.url);
      return;
    }
    if (driver === "s3") return await s3Delete(`private/${name}`);
    await fs.unlink(path.join(PRIVATE_DIR, name));
  } catch {
    /* already gone */
  }
}
