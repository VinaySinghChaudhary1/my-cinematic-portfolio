import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { getPrivate, deletePrivate } from "@/lib/server/storage";
import { decryptAtRest } from "@/lib/server/backup/crypto";
import { storeUploadedBackup } from "@/lib/server/backup/engine";
import { MAX_CHUNKS, toHttp } from "@/lib/server/backup/api";

export const maxDuration = 300;

const schema = z.object({
  uploadId: z.string().regex(/^[0-9a-f-]{36}$/),
  count: z.number().int().min(1).max(MAX_CHUNKS),
  filename: z.string().trim().max(160).default("uploaded backup"),
});

/** Joins the uploaded parts, checks the file and stores it as a backup you can preview and restore. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  const body = schema.parse(await readJson(req));
  const parts: Uint8Array[] = [];
  try {
    for (let i = 0; i < body.count; i++) {
      const enc = await getPrivate(`uploads/${body.uploadId}/${i}.bin`);
      if (!enc) throw new HttpError(400, `Part ${i + 1} of the upload is missing. Please upload the file again.`, "upload_incomplete");
      parts.push(await decryptAtRest(enc));
    }
    const total = parts.reduce((n, p) => n + p.byteLength, 0);
    const bytes = new Uint8Array(total);
    let o = 0;
    for (const p of parts) {
      bytes.set(p, o);
      o += p.byteLength;
    }
    const rec = await storeUploadedBackup(bytes, body.filename.replace(/[^\w.\- ()]/g, "_"));
    await audit(user.id, "backup_uploaded", `${rec.id} · ${total} bytes`, clientIp(req));
    return json({ ok: true, backup: rec }, { status: 201 });
  } catch (e) {
    toHttp(e);
  } finally {
    for (let i = 0; i < body.count; i++) await deletePrivate(`uploads/${body.uploadId}/${i}.bin`);
  }
});
