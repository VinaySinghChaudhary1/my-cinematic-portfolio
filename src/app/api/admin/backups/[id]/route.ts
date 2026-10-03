import { route, json, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { NotFound } from "@/lib/server/errors";
import { deleteBackup, getBackupRecord } from "@/lib/server/backup/engine";

export const DELETE = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { id } = await params;
  const rec = await getBackupRecord(id);
  if (!rec) throw NotFound("Backup");
  await deleteBackup(id);
  await audit(user.id, "backup_deleted", `${id} (${rec.kind})`, clientIp(req));
  return json({ ok: true });
});
