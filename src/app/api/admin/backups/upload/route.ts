import { route, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { HttpError } from "@/lib/server/errors";
import { putPrivate } from "@/lib/server/storage";
import { encryptAtRest } from "@/lib/server/backup/crypto";
import { CHUNK_BYTES, MAX_CHUNKS } from "@/lib/server/backup/api";

export const maxDuration = 120;

/** Receives one part of a backup file (raw body). Parts are kept encrypted until the upload is completed. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`backup-chunk:${user.id}`, 2000, 60 * 60_000);
  const uploadId = req.headers.get("x-upload-id") ?? "";
  const index = Number(req.headers.get("x-chunk-index"));
  if (!/^[0-9a-f-]{36}$/.test(uploadId) || !Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS) throw new HttpError(400, "Invalid upload part.", "bad_chunk");
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > CHUNK_BYTES + 1024) throw new HttpError(413, "Upload part is too large.", "too_large");
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > CHUNK_BYTES + 1024) throw new HttpError(400, "Upload part is empty or too large.", "bad_chunk");
  await putPrivate(`uploads/${uploadId}/${index}.bin`, await encryptAtRest(bytes));
  return json({ ok: true });
});
