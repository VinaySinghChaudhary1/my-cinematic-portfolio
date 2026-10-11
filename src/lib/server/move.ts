/**
 * Move & domain (admin): what this host is, transfer codes for copying the whole site to a new host, and live
 * domain checks. Transfers reuse the backup system: the old site makes a normal backup, seals it with the one-time
 * transfer code (AES-256-GCM, scrypt) and serves it in 4 MB parts; the new site pulls the parts server-to-server,
 * opens them with the same code and stores the result as an uploaded backup, ready to preview and restore (with Undo).
 */
import { createHash, randomInt } from "node:crypto";
import { promises as dns } from "node:dns";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId } from "./ids";
import { getPrivate, putPrivate, deletePrivate, storageDriver, isEphemeralHost } from "./storage";
import { createBackup, exportBackupFile } from "./backup/engine";
import { encryptAtRest, decryptAtRest, encryptWithPassword } from "./backup/crypto";
import { CHUNK_BYTES } from "./backup/api";
import { getSiteUrl, emailConfigured } from "./email";
import { googleConfigured } from "./google";
import { siteFingerprint } from "./instance";
import { checkDomain, type Probe } from "@/lib/move/domain";

export const TRANSFER_TTL_MS = 2 * 60 * 60_000;
const PURPOSE = "transfer";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** e.g. "K7QM-2WZP-…" — 24 random characters (120 bits) in groups of four. */
export function newTransferCode(): string {
  const raw = Array.from({ length: 24 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return raw.match(/.{4}/g)!.join("-");
}
/** Case, spaces and dashes don't matter when the code is typed. */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const codeHash = (code: string) => createHash("sha256").update(`transfer:${normalizeCode(code)}`).digest("hex");
export const looksLikeCode = (code: string) => normalizeCode(code).length === 24;

// ───────────────────────── sending side (old site) ─────────────────────────
export async function cancelTransfers() {
  const rows = await db.select().from(schema.authTokens).where(and(eq(schema.authTokens.purpose, PURPOSE), isNull(schema.authTokens.usedAt)));
  for (const r of rows) {
    await db.update(schema.authTokens).set({ usedAt: Date.now() }).where(eq(schema.authTokens.id, r.id));
    await deletePrivate(`transfers/${r.subjectId}.bin`).catch(() => {});
  }
  return rows.length;
}

export async function createTransfer(opts: { includeMessages: boolean; origin?: string }) {
  await cancelTransfers(); // only one live code at a time
  const rec = await createBackup({ kind: "manual", label: "For moving to a new host", options: { messages: opts.includeMessages, audit: false }, origin: opts.origin });
  const { bytes } = await exportBackupFile(rec.id);
  const code = newTransferCode();
  const sealed = await encryptWithPassword(bytes, normalizeCode(code));
  const tid = newId();
  await putPrivate(`transfers/${tid}.bin`, await encryptAtRest(sealed));
  const now = Date.now();
  const expiresAt = now + TRANSFER_TTL_MS;
  await db.insert(schema.authTokens).values({ id: newId(), kind: "site", subjectId: tid, purpose: PURPOSE, tokenHash: codeHash(code), expiresAt, createdAt: now });
  return { code, expiresAt, size: sealed.byteLength, parts: Math.max(1, Math.ceil(sealed.byteLength / CHUNK_BYTES)), backupId: rec.id };
}

export async function activeTransfer() {
  const [r] = await db
    .select()
    .from(schema.authTokens)
    .where(and(eq(schema.authTokens.purpose, PURPOSE), isNull(schema.authTokens.usedAt), gt(schema.authTokens.expiresAt, Date.now())))
    .orderBy(desc(schema.authTokens.createdAt))
    .limit(1);
  return r ? { expiresAt: r.expiresAt, createdAt: r.createdAt } : null;
}

/** Valid, unused, unexpired transfer for this code → the sealed file. */
export async function openTransfer(code: string) {
  if (!looksLikeCode(code)) return null;
  const [r] = await db
    .select()
    .from(schema.authTokens)
    .where(and(eq(schema.authTokens.tokenHash, codeHash(code)), eq(schema.authTokens.purpose, PURPOSE), isNull(schema.authTokens.usedAt), gt(schema.authTokens.expiresAt, Date.now())))
    .limit(1);
  if (!r) return null;
  const enc = await getPrivate(`transfers/${r.subjectId}.bin`);
  if (!enc) return null;
  const bytes = await decryptAtRest(enc);
  return { bytes, expiresAt: r.expiresAt, parts: Math.max(1, Math.ceil(bytes.byteLength / CHUNK_BYTES)) };
}

// ───────────────────────── receiving side (new site) ─────────────────────────
export class MoveError extends Error {}

/** Fetches one thing from the old site's /api/transfer. */
export async function fetchFromOld(from: string, code: string, part: "info" | number): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${from}/api/transfer?part=${part}`, { headers: { "x-transfer-code": normalizeCode(code) }, cache: "no-store", signal: AbortSignal.timeout(90_000) });
  } catch {
    throw new MoveError(`Couldn't reach ${from}. Check the address and that the old site is online.`);
  }
  if (res.status === 404) throw new MoveError(`${from} doesn't support transfers yet — update the old site to v1.6 first, or use a downloaded backup (Backups → Restore from a file).`);
  if (res.status === 403) throw new MoveError("The transfer code is wrong, expired (2 hours) or was cancelled. Create a new one on the old site.");
  if (res.status === 429) throw new MoveError("Too many attempts — wait a few minutes and try again.");
  if (!res.ok) throw new MoveError(`The old site answered with an error (${res.status}).`);
  return res;
}

// ───────────────────────── this host ─────────────────────────
export async function hostFacts() {
  const db = (process.env.DATABASE_URL || "").startsWith("libsql:") || (process.env.DATABASE_URL || "").startsWith("https:") ? "Turso (cloud database)" : "SQLite file on this server";
  const host = process.env.VERCEL
    ? `Vercel${process.env.VERCEL_REGION ? ` · ${process.env.VERCEL_REGION}` : ""}`
    : process.env.NETLIFY
      ? "Netlify"
      : process.env.AWS_LAMBDA_FUNCTION_NAME
        ? "AWS Lambda"
        : process.env.RENDER
          ? "Render"
          : process.env.RAILWAY_ENVIRONMENT
            ? "Railway"
            : process.env.FLY_APP_NAME
              ? "Fly.io"
              : "Your own server / Docker";
  const files = { local: "Server disk (DATA_DIR)", blob: "Vercel Blob", s3: "S3 / Cloudflare R2 bucket" }[storageDriver()];
  return {
    host,
    database: db,
    files,
    ephemeral: isEphemeralHost(),
    siteUrl: await getSiteUrl(),
    envSiteUrl: process.env.SITE_URL || "",
    email: emailConfigured(),
    emailFrom: process.env.EMAIL_FROM || "",
    google: googleConfigured(),
    fingerprint: await siteFingerprint(),
  };
}

// ───────────────────────── domain checks (real network) ─────────────────────────
const DOH_TYPE = { A: 1, AAAA: 28, CNAME: 5, TXT: 16 } as const;

async function resolveDoh(type: keyof typeof DOH_TYPE, name: string): Promise<string[]> {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error("doh");
  const j = (await res.json()) as { Answer?: { type: number; data: string }[] };
  return (j.Answer ?? []).filter((x) => x.type === DOH_TYPE[type]).map((x) => x.data.replace(/^"|"$/g, "").replace(/"\s*"/g, "").replace(/\.$/, ""));
}

async function resolveNode(type: keyof typeof DOH_TYPE, name: string): Promise<string[]> {
  switch (type) {
    case "A":
      return dns.resolve4(name);
    case "AAAA":
      return dns.resolve6(name);
    case "CNAME":
      return (await dns.resolveCname(name)).map((x) => x.replace(/\.$/, ""));
    case "TXT":
      return (await dns.resolveTxt(name)).map((parts) => parts.join(""));
  }
}

/**
 * DNS-over-HTTPS (fresh, works on every host), falling back to the system resolver.
 * Returns [] when the record genuinely doesn't exist; throws when DNS couldn't be asked at all.
 */
export async function resolveRecords(type: keyof typeof DOH_TYPE, name: string): Promise<string[]> {
  try {
    return await resolveDoh(type, name);
  } catch {
    try {
      return await Promise.race([resolveNode(type, name), new Promise<string[]>((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000))]);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN") return [];
      throw new Error("DNS lookup unavailable");
    }
  }
}

async function probe(url: string): Promise<Probe> {
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(9000), headers: { "user-agent": "portfolio-domain-check" } });
    let site: string | undefined;
    try {
      const j = (await res.json()) as { site?: unknown };
      if (typeof j.site === "string") site = j.site;
    } catch {
      /* not JSON */
    }
    return { ok: res.ok, status: res.status, site, finalHost: new URL(res.url).hostname };
  } catch (e) {
    const msg = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : "unreachable";
    return { ok: false, status: 0, error: /certificate|SSL|TLS/i.test(msg) ? "HTTPS certificate not ready yet" : /ENOTFOUND|EAI_AGAIN/i.test(msg) ? "domain not found in DNS" : /timeout|abort/i.test(msg) ? "timed out" : msg.slice(0, 120) };
  }
}

export async function runDomainCheck(input: string) {
  const me = await hostFacts();
  return checkDomain(input, { resolve: resolveRecords, probe, me: { fingerprint: me.fingerprint, siteUrl: me.siteUrl, email: me.email, google: me.google, emailFrom: me.emailFrom } });
}
