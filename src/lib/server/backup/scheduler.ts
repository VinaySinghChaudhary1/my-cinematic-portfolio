/**
 * Scheduled backups that work on any host.
 *
 * One function — runScheduledBackupIfDue() — decides whether a backup is due and makes it. It can be triggered by:
 *   1. the built-in timer (long-running Node servers: VPS, Hostinger, Docker, Render, Railway…) — see src/instrumentation.ts
 *   2. Vercel Cron (vercel.json → GET /api/cron/backup with the CRON_SECRET header)
 *   3. any external cron: system crontab, GitHub Actions, cron-job.org… → same URL + header
 * Triggering it more often than needed is harmless: it only runs when the chosen interval has passed,
 * and a database lock stops two instances from running it twice.
 */
import { eq } from "drizzle-orm";
import { db, schema, ensureSchema } from "@/db";
import { DEFAULT_BACKUP_OPTIONS, type BackupOptions } from "./archive";
import { acquireLock, createBackup, pruneBackups } from "./engine";

export type Frequency = "daily" | "weekly" | "monthly";
export interface BackupConfig {
  schedule: { enabled: boolean; frequency: Frequency; keep: number; options: BackupOptions };
  lastRun: { at: number; ok: boolean; message: string; backupId?: string } | null;
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  schedule: { enabled: false, frequency: "weekly", keep: 8, options: { ...DEFAULT_BACKUP_OPTIONS } },
  lastRun: null,
};

const KEY = "backup_config";
export const INTERVAL_MS: Record<Frequency, number> = { daily: 86_400_000, weekly: 7 * 86_400_000, monthly: 30 * 86_400_000 };
const SLACK_MS = 60 * 60_000; // a trigger an hour early still counts

export async function getBackupConfig(): Promise<BackupConfig> {
  await ensureSchema();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY)).limit(1);
  let stored: Partial<BackupConfig> = {};
  try {
    stored = row ? JSON.parse(row.value) : {};
  } catch {
    /* corrupted → defaults */
  }
  return {
    schedule: { ...DEFAULT_BACKUP_CONFIG.schedule, ...(stored.schedule ?? {}), options: { ...DEFAULT_BACKUP_OPTIONS, ...(stored.schedule?.options ?? {}) } },
    lastRun: stored.lastRun ?? null,
  };
}

export async function saveBackupConfig(cfg: BackupConfig) {
  const value = JSON.stringify(cfg);
  await db
    .insert(schema.settings)
    .values({ key: KEY, value, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: Date.now() } });
}

export function nextRunAt(cfg: BackupConfig): number | null {
  if (!cfg.schedule.enabled) return null;
  const lastOk = cfg.lastRun?.at ?? 0;
  return lastOk ? lastOk + INTERVAL_MS[cfg.schedule.frequency] : Date.now();
}

export async function runScheduledBackupIfDue(opts: { force?: boolean; origin?: string } = {}) {
  const cfg = await getBackupConfig();
  if (!cfg.schedule.enabled && !opts.force) return { ran: false, reason: "Scheduled backups are turned off." };
  const due = nextRunAt(cfg);
  if (!opts.force && due && Date.now() + SLACK_MS < due) return { ran: false, reason: `Not due yet (next: ${new Date(due).toISOString()}).` };

  const release = await acquireLock("scheduled-backup", 30 * 60_000);
  if (!release) return { ran: false, reason: "Another instance is making the backup." };
  try {
    const rec = await createBackup({ kind: "scheduled", label: `Scheduled ${cfg.schedule.frequency} backup`, options: cfg.schedule.options, origin: opts.origin });
    await pruneBackups("scheduled", Math.max(1, Math.min(60, cfg.schedule.keep)));
    await saveBackupConfig({ ...(await getBackupConfig()), lastRun: { at: Date.now(), ok: true, message: "Backup created.", backupId: rec.id } });
    return { ran: true, backupId: rec.id };
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 300) : "Backup failed.";
    console.error("[backup] scheduled backup failed", e);
    // keep the previous success time so it retries on the next trigger
    const latest = await getBackupConfig();
    const retryBase = Date.now() - INTERVAL_MS[latest.schedule.frequency] + 60 * 60_000; // retry in about an hour
    await saveBackupConfig({ ...latest, lastRun: { at: latest.lastRun?.ok ? latest.lastRun.at : retryBase, ok: false, message } });
    return { ran: false, reason: message };
  } finally {
    await release();
  }
}

/** How scheduled backups get triggered on this host (shown on the Backups page). */
export function schedulerMode(): "internal" | "vercel-cron" | "external" {
  if (process.env.VERCEL) return "vercel-cron";
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.BACKUP_SCHEDULER === "off") return "external";
  return "internal";
}

let started = false;
/** Built-in timer for long-running servers. Checks every 15 minutes; never runs on serverless hosts. */
export function startInternalScheduler() {
  if (started || schedulerMode() !== "internal") return;
  started = true;
  const tick = () => runScheduledBackupIfDue().catch((e) => console.error("[backup] scheduler tick failed", e));
  setTimeout(tick, 2 * 60_000).unref?.();
  setInterval(tick, 15 * 60_000).unref?.();
  console.log("[backup] built-in backup scheduler started (checks every 15 minutes)");
}
