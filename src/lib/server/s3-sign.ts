/**
 * Minimal AWS Signature V4 for S3-compatible object storage (AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO).
 * Node's built-in crypto only — no extra package to install.
 */
import crypto from "node:crypto";

const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac("sha256", key).update(data).digest();
const hex = (data: string | Uint8Array) => crypto.createHash("sha256").update(data).digest("hex");

/** RFC 3986 encoding used by SigV4 (keeps "/" when encoding a path). */
export function awsEncode(s: string, keepSlash = false): string {
  return encodeURIComponent(s)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(keepSlash ? /%2F/g : /$^/, "/");
}

export interface SignInput {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: Uint8Array;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
  now?: Date;
}

/** Returns the headers to send (incl. Authorization, x-amz-date, x-amz-content-sha256). */
export function signRequest(i: SignInput): Record<string, string> {
  const u = new URL(i.url);
  const service = i.service ?? "s3";
  const now = i.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20261002T080000Z
  const day = amzDate.slice(0, 8);
  const payloadHash = hex(i.body ?? new Uint8Array());
  const headers: Record<string, string> = { ...(i.headers ?? {}), host: u.host, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash };

  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, " ")]));
  const names = Object.keys(lower).sort();
  const canonicalHeaders = names.map((n) => `${n}:${lower[n]}\n`).join("");
  const signedHeaders = names.join(";");
  const query = [...u.searchParams.entries()]
    .map(([k, v]) => [awsEncode(k), awsEncode(v)])
    .sort(([a, x], [b, y]) => (a === b ? (x < y ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  // u.pathname is already percent-encoded by the caller; S3 does not double-encode
  const canonical = [i.method.toUpperCase(), u.pathname || "/", query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${day}/${i.region}/${service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(canonical)].join("\n");
  const kDate = hmac(`AWS4${i.secretAccessKey}`, day);
  const kSigning = hmac(hmac(hmac(kDate, i.region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(toSign).digest("hex");

  const out: Record<string, string> = { ...(i.headers ?? {}), "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash };
  out.Authorization = `AWS4-HMAC-SHA256 Credential=${i.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return out;
}
