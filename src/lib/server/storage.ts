import path from "node:path";
import fs from "node:fs/promises";
import { HttpError } from "./errors";

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

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export interface Stored {
  url: string;
  storageKey: string;
}

const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function storeFile(bytes: Uint8Array, ext: string, mime: string, folder: string): Promise<Stored> {
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "general";
  const name = `${crypto.randomUUID()}.${ext}`;
  const key = `${safeFolder}/${name}`;

  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`portfolio/${key}`, Buffer.from(bytes), {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    return { url: blob.url, storageKey: blob.url };
  }

  if (process.env.VERCEL) {
    throw new HttpError(500, "File storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel.", "storage_unconfigured");
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
    const full = resolveLocal(storageKey);
    if (full) await fs.unlink(full);
  } catch (e) {
    console.warn("[storage] delete failed (ignored)", e);
  }
}

/** Resolves a /media/<key> path to disk, refusing anything that escapes the upload dir. */
export function resolveLocal(key: string): string | null {
  if (!/^[a-z0-9-]+\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/i.test(key)) return null;
  const full = path.resolve(UPLOAD_DIR, key);
  if (!full.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return null;
  return full;
}
