import { z } from "zod";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { openBackup, previewRestore } from "@/lib/server/backup/engine";
import { toHttp } from "@/lib/server/backup/api";

export const maxDuration = 300;

const schema = z.object({ backupPassword: z.string().max(200).optional() });

/** Opens a backup, verifies every checksum and shows what a restore would change. Changes nothing. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  await rateLimit(`backup-inspect:${user.id}`, 30, 15 * 60_000);
  const { id } = await params;
  const body = schema.parse(await readJson(req));
  try {
    const archive = await openBackup(id, body.backupPassword);
    return json({ ok: true, preview: await previewRestore(archive, req.nextUrl.origin) });
  } catch (e) {
    toHttp(e);
  }
});
