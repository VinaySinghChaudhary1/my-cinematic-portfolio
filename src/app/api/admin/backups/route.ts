import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { storageDriver, isEphemeralHost } from "@/lib/server/storage";
import { createBackup, listBackups } from "@/lib/server/backup/engine";
import { getBackupConfig, nextRunAt, schedulerMode } from "@/lib/server/backup/scheduler";
import { optionsSchema, toHttp } from "@/lib/server/backup/api";
import { getAllSections } from "@/lib/server/content";

export const maxDuration = 300;

export const GET = route(async () => {
  await requireAdmin();
  const [backups, config, sections] = await Promise.all([listBackups(), getBackupConfig(), getAllSections()]);
  return json({
    ok: true,
    backups,
    config,
    nextRunAt: nextRunAt(config),
    sections: sections.map((s) => ({ key: s.key, title: s.title, type: s.type })),
    platform: {
      storage: storageDriver(),
      ephemeral: isEphemeralHost(),
      scheduler: schedulerMode(),
      cronSecretSet: !!process.env.CRON_SECRET,
      dedicatedSecret: !!process.env.BACKUP_SECRET,
    },
  });
});

const createSchema = z.object({ label: z.string().trim().max(120).default(""), options: optionsSchema });

export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`backup-create:${user.id}`, 20, 60 * 60_000);
  const body = createSchema.parse(await readJson(req));
  try {
    const record = await createBackup({ kind: "manual", label: body.label, options: body.options, origin: req.nextUrl.origin });
    await audit(user.id, "backup_created", `${record.id} · ${record.size} bytes`, clientIp(req));
    return json({ ok: true, backup: record }, { status: 201 });
  } catch (e) {
    toHttp(e);
  }
});
