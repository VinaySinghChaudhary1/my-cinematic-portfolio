import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { openBackup, restoreBackup } from "@/lib/server/backup/engine";
import { requireReauth, scopeSchema, toHttp } from "@/lib/server/backup/api";

export const maxDuration = 300;

const schema = z.object({
  backupPassword: z.string().max(200).optional(),
  adminPassword: z.string().min(1).max(200),
  confirm: z.string(),
  scope: scopeSchema,
});

/** Restores a backup. A snapshot of the current site is taken first, so the restore can be undone. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { id } = await params;
  const body = schema.parse(await readJson(req));
  if (body.confirm.trim().toUpperCase() !== "RESTORE") throw new HttpError(400, 'Type RESTORE to confirm.', "confirm", { confirm: 'Type RESTORE' });
  await requireReauth(user, body.adminPassword);
  try {
    const archive = await openBackup(id, body.backupPassword);
    const report = await restoreBackup(archive, body.scope, { origin: req.nextUrl.origin, actorId: user.id });
    await audit(user.id, "backup_restore", `from ${id} · snapshot ${report.snapshotId}`, clientIp(req));
    return json({ ok: true, report });
  } catch (e) {
    toHttp(e);
  }
});
