import { route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { verifyScoped } from "@/lib/server/session";
import { getPrivate, deletePrivate } from "@/lib/server/storage";
import { decryptAtRest } from "@/lib/server/backup/crypto";
import { CHUNK_BYTES } from "@/lib/server/backup/api";

export const maxDuration = 300;

/** Step 2 of a download: GET ?t=<token>&part=<n>. Parts stay under serverless response limits; the browser joins them. */
export const GET = route(async (req) => {
  const user = await requireAdmin();
  const t = await verifyScoped(req.nextUrl.searchParams.get("t"), "backup-download");
  if (!t || t.uid !== user.id) throw new HttpError(403, "This download link expired. Start the download again.", "download_expired");
  const part = Number(req.nextUrl.searchParams.get("part") ?? 0);
  const parts = Number(t.parts);
  if (!Number.isInteger(part) || part < 0 || part >= parts) throw new HttpError(400, "Invalid part.", "bad_part");
  const name = `exports/${t.sub}.bin`;
  const enc = await getPrivate(name);
  if (!enc) throw new HttpError(410, "This download is no longer available. Start it again.", "download_gone");
  const bytes = await decryptAtRest(enc);
  const chunk = bytes.subarray(part * CHUNK_BYTES, Math.min(bytes.byteLength, (part + 1) * CHUNK_BYTES));
  if (part === parts - 1) await deletePrivate(name);
  return new Response(new Uint8Array(chunk), {
    headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
});
