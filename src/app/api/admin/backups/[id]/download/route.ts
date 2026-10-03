import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { signScoped } from "@/lib/server/session";
import { newId } from "@/lib/server/ids";
import { putPrivate } from "@/lib/server/storage";
import { getSettings } from "@/lib/server/content";
import { exportBackupFile } from "@/lib/server/backup/engine";
import { encryptAtRest } from "@/lib/server/backup/crypto";
import { CHUNK_BYTES, downloadName, requireReauth, toHttp } from "@/lib/server/backup/api";

export const maxDuration = 300;

const schema = z.object({ adminPassword: z.string().min(1).max(200), encryptPassword: z.string().max(200).optional() });

/** Step 1 of a download: re-check the admin password, prepare the file, return a 10-minute token + part count. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { id } = await params;
  const body = schema.parse(await readJson(req));
  await requireReauth(user, body.adminPassword);
  try {
    const { bytes, encrypted, record } = await exportBackupFile(id, body.encryptPassword || undefined);
    const exportId = newId();
    await putPrivate(`exports/${exportId}.bin`, await encryptAtRest(bytes));
    const parts = Math.max(1, Math.ceil(bytes.byteLength / CHUNK_BYTES));
    const token = await signScoped(exportId, "backup-download", 600, { parts, uid: user.id });
    const settings = await getSettings();
    await audit(user.id, "backup_downloaded", `${id}${encrypted ? " (encrypted)" : ""}`, clientIp(req));
    return json({ ok: true, token, parts, size: bytes.byteLength, filename: downloadName(settings.profile.name, record.createdAt, encrypted) });
  } catch (e) {
    toHttp(e);
  }
});
