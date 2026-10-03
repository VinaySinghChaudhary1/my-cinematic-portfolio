import { route, json } from "@/lib/server/http";
import { HttpError } from "@/lib/server/errors";
import { safeEqual } from "@/lib/server/backup/crypto";
import { runScheduledBackupIfDue } from "@/lib/server/backup/scheduler";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Trigger for scheduled backups from outside: Vercel Cron, a server crontab, GitHub Actions, cron-job.org…
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/backup
 * It only makes a backup when one is due, so calling it hourly or daily is fine.
 */
async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) throw new HttpError(503, "CRON_SECRET is not set on this server.", "cron_unconfigured");
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) throw new HttpError(401, "Unauthorized.", "unauthorized");
  const r = await runScheduledBackupIfDue({ origin: new URL(req.url).origin });
  return json({ ok: true, ...r });
}

export const GET = route(handler, { csrf: false });
export const POST = route(handler, { csrf: false });
