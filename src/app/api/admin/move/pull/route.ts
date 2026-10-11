import { z } from "zod";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { HttpError } from "@/lib/server/errors";
import { newId } from "@/lib/server/ids";
import { putPrivate, getPrivate, deletePrivate } from "@/lib/server/storage";
import { encryptAtRest, decryptAtRest, decryptWithPassword } from "@/lib/server/backup/crypto";
import { storeUploadedBackup } from "@/lib/server/backup/engine";
import { CHUNK_BYTES, MAX_CHUNKS, toHttp } from "@/lib/server/backup/api";
import { fetchFromOld, MoveError, normalizeCode, looksLikeCode } from "@/lib/server/move";
import { siteFingerprint } from "@/lib/server/instance";
import { normalizeSiteUrl } from "@/lib/site-url";

export const maxDuration = 300;

const from = z.string().trim().max(300);
const code = z.string().trim().max(60).refine(looksLikeCode, "Enter the 24-character transfer code");
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("info"), from, code }),
  z.object({ action: z.literal("part"), from, code, pullId: z.string().regex(/^[0-9a-f-]{36}$/), index: z.number().int().min(0).max(MAX_CHUNKS - 1) }),
  z.object({ action: z.literal("finish"), from, code, pullId: z.string().regex(/^[0-9a-f-]{36}$/), count: z.number().int().min(1).max(MAX_CHUNKS) }),
]);

function oldSite(v: string) {
  const o = normalizeSiteUrl(/^[a-z]+:\/\//i.test(v) ? v : `https://${v}`);
  if (!o) throw new HttpError(400, "Enter the old site's address, e.g. https://yourname.com", "validation", { from: "Use https://…" });
  return o;
}

/**
 * Copies the old site into this one, driven by the browser in small steps (each step fits serverless time limits):
 * info → part × N → finish. The result is stored as an uploaded backup; the admin then previews and restores it.
 */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`pull:${user.id}`, 1000, 60 * 60_000);
  const body = schema.parse(await readJson(req));
  const src = oldSite(body.from);
  try {
    if (body.action === "info") {
      // pulling from yourself would restore a site onto itself — almost certainly a mistake
      const health = await fetch(`${src}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(15_000) }).then((r) => r.json()).catch(() => ({}));
      if ((health as { site?: string }).site === (await siteFingerprint())) throw new MoveError("That address is THIS site. Open the NEW site's admin and enter the OLD site's address.");
      const res = await fetchFromOld(src, body.code, "info");
      const info = (await res.json()) as { parts: number; size: number; name: string; appVersion: string; expiresAt: number };
      if (!Number.isInteger(info.parts) || info.parts < 1 || info.parts > MAX_CHUNKS) throw new MoveError("The old site sent an invalid transfer.");
      return json({ ok: true, pullId: newId(), ...info, from: src });
    }
    if (body.action === "part") {
      const res = await fetchFromOld(src, body.code, body.index);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (!bytes.byteLength || bytes.byteLength > CHUNK_BYTES + 1024) throw new MoveError("A part of the transfer was empty or too large.");
      await putPrivate(`uploads/${body.pullId}/${body.index}.bin`, await encryptAtRest(bytes));
      return json({ ok: true, bytes: bytes.byteLength });
    }
    // finish
    const parts: Uint8Array[] = [];
    try {
      for (let i = 0; i < body.count; i++) {
        const enc = await getPrivate(`uploads/${body.pullId}/${i}.bin`);
        if (!enc) throw new MoveError(`Part ${i + 1} is missing — start the transfer again.`);
        parts.push(await decryptAtRest(enc));
      }
      const joined = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
      let o = 0;
      for (const p of parts) {
        joined.set(p, o);
        o += p.byteLength;
      }
      let plain: Uint8Array;
      try {
        plain = await decryptWithPassword(joined, normalizeCode(body.code));
      } catch {
        throw new MoveError("The transfer couldn't be opened with this code (damaged or a different code). Start again.");
      }
      const rec = await storeUploadedBackup(plain, `Moved from ${new URL(src).hostname}`);
      await audit(user.id, "transfer_received", `${new URL(src).hostname} · ${plain.byteLength} bytes`, clientIp(req));
      return json({ ok: true, backup: rec });
    } finally {
      for (let i = 0; i < body.count; i++) await deletePrivate(`uploads/${body.pullId}/${i}.bin`).catch(() => {});
    }
  } catch (e) {
    if (e instanceof MoveError) throw new HttpError(400, e.message, "move_failed");
    toHttp(e);
  }
});
