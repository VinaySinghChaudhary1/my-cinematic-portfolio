import { route, json, clientIp } from "@/lib/server/http";
import { HttpError } from "@/lib/server/errors";
import { rateLimit } from "@/lib/server/rate-limit";
import { audit } from "@/lib/server/auth";
import { openTransfer } from "@/lib/server/move";
import { CHUNK_BYTES } from "@/lib/server/backup/api";
import { getSettings } from "@/lib/server/content";
import { APP_VERSION } from "@/lib/version";

export const maxDuration = 120;

/**
 * Serves the site to a NEW copy of itself during a move. No login: the one-time transfer code (header
 * x-transfer-code, valid 2 hours, created in Admin → Move & domain) is the key, and the data is additionally sealed
 * with that code. ?part=info → size and part count; ?part=N → the N-th 4 MB part.
 */
export const GET = route(async (req) => {
  const ip = clientIp(req);
  await rateLimit(`transfer:${ip}`, 600, 60 * 60_000);
  const t = await openTransfer(req.headers.get("x-transfer-code") ?? "");
  if (!t) {
    await rateLimit(`transfer-fail:${ip}`, 20, 60 * 60_000);
    throw new HttpError(403, "Transfer code is wrong, expired or cancelled.", "transfer_denied");
  }
  const part = req.nextUrl.searchParams.get("part") ?? "info";
  if (part === "info") {
    const s = await getSettings();
    await audit(null, "transfer_started", `from ${ip}`, ip);
    return json({ ok: true, parts: t.parts, size: t.bytes.byteLength, chunk: CHUNK_BYTES, name: s.profile.name, appVersion: APP_VERSION, expiresAt: t.expiresAt });
  }
  const n = Number(part);
  if (!Number.isInteger(n) || n < 0 || n >= t.parts) throw new HttpError(400, "Invalid part.", "bad_part");
  const chunk = t.bytes.subarray(n * CHUNK_BYTES, Math.min(t.bytes.byteLength, (n + 1) * CHUNK_BYTES));
  return new Response(new Uint8Array(chunk), { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}, { csrf: false });
