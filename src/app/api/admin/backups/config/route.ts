import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { getBackupConfig, saveBackupConfig, runScheduledBackupIfDue } from "@/lib/server/backup/scheduler";
import { optionsSchema } from "@/lib/server/backup/api";

export const maxDuration = 300;

const schema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  keep: z.number().int().min(1).max(60),
  options: optionsSchema,
});

export const PUT = route(async (req) => {
  const user = await requireAdmin();
  const schedule = schema.parse(await readJson(req));
  const cfg = await getBackupConfig();
  await saveBackupConfig({ ...cfg, schedule });
  await audit(user.id, "backup_schedule_saved", `${schedule.enabled ? schedule.frequency : "off"}, keep ${schedule.keep}`, clientIp(req));
  return json({ ok: true });
});

/** "Run scheduled backup now" — useful to test the schedule settings. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`backup-run:${user.id}`, 10, 60 * 60_000);
  const r = await runScheduledBackupIfDue({ force: true, origin: req.nextUrl.origin });
  return json({ ok: r.ran, ...r }, { status: r.ran ? 200 : 500 });
});
