import { z } from "zod";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { applyEntries } from "@/lib/server/import";
import { createBackup } from "@/lib/server/backup/engine";

export const maxDuration = 120;

const schema = z.object({
  entries: z.array(z.object({ id: z.string().max(20), sectionKey: z.string().max(40), data: z.record(z.string(), z.unknown()) })).min(1, "Choose at least one entry").max(300),
  status: z.enum(["draft", "published"]).default("draft"),
});

/** Adds the chosen entries. A content backup is taken first so the whole import can be undone in Backups. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  const body = schema.parse(await readJson(req, 3_000_000));
  let backupId: string | null = null;
  try {
    const rec = await createBackup({ kind: "pre-restore", label: "Before bulk import", options: { media: false, bundled: false }, origin: req.nextUrl.origin });
    backupId = rec.id;
  } catch (e) {
    console.error("[import] pre-import backup failed", e);
    throw new HttpError(500, "Couldn't take a safety backup first, so nothing was imported. Try again, or take a backup manually in Backups.", "backup_failed");
  }
  const r = await applyEntries(body.entries, body.status);
  if (!r.ok) return json({ ok: false, error: "Some entries need fixing before they can be added (marked in red). Nothing was added.", fields: Object.fromEntries(Object.entries(r.errors).map(([id, p]) => [id, p.join(" | ")])) }, { status: 422 });
  await audit(user.id, "content_imported", `${r.added} entries as ${body.status}`, clientIp(req));
  return json({ ok: true, added: r.added, counts: r.counts, backupId });
});
