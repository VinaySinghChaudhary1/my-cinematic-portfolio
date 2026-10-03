/**
 * API keys are encrypted before they touch the database (AES-256-GCM).
 * Key = HKDF(AI_ENCRYPTION_KEY, or AUTH_SECRET when that isn't set). A leaked database or backup alone can't reveal them.
 */
import crypto from "node:crypto";

function masterKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY || process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me-please-0123456789";
  if (process.env.NODE_ENV === "production" && secret.length < 32) throw new Error("AI_ENCRYPTION_KEY or AUTH_SECRET (32+ chars) must be set.");
  return Buffer.from(crypto.hkdfSync("sha256", secret, "pf-ai", "ai-keys-v1", 32));
}

export function encryptKey(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${ct.toString("base64url")}.${c.getAuthTag().toString("base64url")}`;
}

/** Returns null when the value can't be decrypted (e.g. the secret changed) — the UI then asks for the key again. */
export function decryptKey(enc: string | undefined): string | null {
  if (!enc) return null;
  const [v, iv, ct, tag] = enc.split(".");
  if (v !== "v1" || !iv || !ct || !tag) return null;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export const last4 = (key: string) => key.trim().slice(-4);
