"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarClock, Download, HardDrive, Lock, Play, RotateCcw, Save, Trash2, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { api, formatBytes } from "../api";
import { Button, Card, Switch, inputCls } from "../ui";
import { IncludeOptions } from "./IncludeOptions";
import { DownloadDialog } from "./DownloadDialog";
import { RestoreWizard } from "./RestoreWizard";
import { KIND_LABEL, type BackupConfig, type BackupOptions, type BackupRecord, type Platform, type SectionInfo } from "./types";

interface Data {
  backups: BackupRecord[];
  config: BackupConfig;
  nextRunAt: number | null;
  sections: SectionInfo[];
  platform: Platform;
}

const CHUNK = 4_000_000;
const DEFAULT_OPTIONS: BackupOptions = { sections: "all", settings: true, media: true, bundled: true, messages: false, audit: false };
const STORAGE_LABEL: Record<Platform["storage"], string> = { local: "Server disk (DATA_DIR)", blob: "Vercel Blob", s3: "S3-compatible bucket" };

export function BackupsManager() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [options, setOptions] = useState<BackupOptions>(DEFAULT_OPTIONS);
  const [creating, setCreating] = useState(false);
  const [download, setDownload] = useState<BackupRecord | null>(null);
  const [restore, setRestore] = useState<BackupRecord | null>(null);
  const [upload, setUpload] = useState<{ name: string; pct: number } | null>(null);
  const [schedule, setSchedule] = useState<BackupConfig["schedule"] | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await api<Data>("/api/admin/backups");
      setData(d);
      setSchedule((s) => s ?? d.config.schedule);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load backups");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setCreating(true);
    try {
      const r = await api<{ backup: BackupRecord }>("/api/admin/backups", { method: "POST", json: { label, options } });
      toast.success("Backup created", { action: { label: "Download", onClick: () => setDownload(r.backup) } });
      setLabel("");
      await load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setCreating(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 300 * CHUNK) return toast.error("That file is larger than 1.2 GB.");
    const uploadId = crypto.randomUUID();
    const count = Math.max(1, Math.ceil(file.size / CHUNK));
    setUpload({ name: file.name, pct: 0 });
    try {
      for (let i = 0; i < count; i++) {
        const part = file.slice(i * CHUNK, Math.min(file.size, (i + 1) * CHUNK));
        await api("/api/admin/backups/upload", {
          method: "POST",
          body: part,
          headers: { "Content-Type": "application/octet-stream", "X-Upload-Id": uploadId, "X-Chunk-Index": String(i) },
        });
        setUpload({ name: file.name, pct: Math.round(((i + 1) / count) * 100) });
      }
      const r = await api<{ backup: BackupRecord }>("/api/admin/backups/upload/complete", { method: "POST", json: { uploadId, count, filename: file.name } });
      toast.success("Backup uploaded and verified");
      await load();
      setRestore(r.backup);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUpload(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(b: BackupRecord) {
    if (!confirm(`Delete this ${KIND_LABEL[b.kind].toLowerCase()} backup from ${new Date(b.createdAt).toLocaleString()}? This can't be undone.`)) return;
    try {
      await api(`/api/admin/backups/${b.id}`, { method: "DELETE" });
      toast.success("Backup deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  async function saveSchedule() {
    if (!schedule) return;
    setSavingSchedule(true);
    try {
      await api("/api/admin/backups/config", { method: "PUT", json: schedule });
      toast.success(schedule.enabled ? `Scheduled ${schedule.frequency} backups are on` : "Scheduled backups are off");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function runNow() {
    setRunningNow(true);
    try {
      await api("/api/admin/backups/config", { method: "POST" });
      toast.success("Scheduled backup created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setRunningNow(false);
      await load();
    }
  }

  if (error && !data) return <ErrorState text={error} onRetry={load} />;
  if (!data || !schedule) return <Spinner label="Loading backups…" />;
  const { platform } = data;
  const last = data.backups[0];

  return (
    <div className="space-y-6">
      {/* status strip */}
      <ul className="grid gap-3 sm:grid-cols-3">
        <Stat Icon={Archive} label="Latest backup" value={last ? `${timeAgo(last.createdAt)} · ${KIND_LABEL[last.kind]}` : "None yet"} tone={last && Date.now() - last.createdAt < 14 * 864e5 ? "ok" : "warn"} />
        <Stat Icon={HardDrive} label="Backups are kept in" value={STORAGE_LABEL[platform.storage]} tone={platform.ephemeral && platform.storage === "local" ? "warn" : "ok"} />
        <Stat
          Icon={CalendarClock}
          label="Schedule"
          value={data.config.schedule.enabled ? `${cap(data.config.schedule.frequency)}${data.nextRunAt ? ` · next ${new Date(data.nextRunAt).toLocaleDateString()}` : ""}` : "Off"}
          tone={data.config.lastRun && !data.config.lastRun.ok ? "warn" : "ok"}
        />
      </ul>
      {platform.ephemeral && platform.storage === "local" && (
        <Warn>This host&apos;s disk is temporary. Set BLOB_READ_WRITE_TOKEN (Vercel Blob) or the S3_* variables so uploads and backups are kept.</Warn>
      )}
      {data.config.lastRun && !data.config.lastRun.ok && <Warn>Last scheduled backup failed: {data.config.lastRun.message}</Warn>}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* create */}
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Create a backup</h2>
          <p className="mt-1 text-sm text-muted">Choose what to include. A copy is kept here (encrypted) and you can download it any time.</p>
          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="bk-label" className="mb-1 block text-xs text-muted">
                Note (optional)
              </label>
              <input id="bk-label" className={inputCls} value={label} maxLength={120} placeholder="e.g. Before adding v1.4 projects" onChange={(e) => setLabel(e.target.value)} />
            </div>
            <IncludeOptions idPrefix="bk" value={options} onChange={setOptions} sections={data.sections} />
            <Button onClick={create} loading={creating} className="w-full sm:w-auto">
              <Archive className="size-4" aria-hidden /> Create backup
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          {/* upload */}
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink">Restore from a file</h2>
            <p className="mt-1 text-sm text-muted">Upload a backup you downloaded earlier (.zip or password-protected .zip.enc). It&apos;s verified first — nothing changes until you confirm.</p>
            <input ref={fileRef} type="file" accept=".zip,.enc,application/zip,application/octet-stream" className="sr-only" id="bk-file" onChange={(e) => onFile(e.target.files?.[0])} />
            {upload ? (
              <div className="mt-4" aria-live="polite">
                <p className="truncate text-sm text-ink">{upload.name}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${upload.pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-faint">{upload.pct < 100 ? `Uploading… ${upload.pct}%` : "Verifying…"}</p>
              </div>
            ) : (
              <label htmlFor="bk-file" className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted transition hover:border-accent-2/60 hover:text-ink">
                <Upload className="size-6 text-accent-2" aria-hidden />
                Choose a backup file
                <span className="text-xs text-faint">Up to 1.2 GB · uploaded in parts, works on every host</span>
              </label>
            )}
          </Card>

          {/* schedule */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">Automatic backups</h2>
                <p className="mt-1 text-sm text-muted">Optional. Old scheduled backups are removed automatically.</p>
              </div>
              <Switch id="sch-on" label="Automatic backups" checked={schedule.enabled} onChange={(v) => setSchedule({ ...schedule, enabled: v })} />
            </div>
            {schedule.enabled && (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sch-freq" className="mb-1 block text-xs text-muted">
                      How often
                    </label>
                    <select id="sch-freq" className={inputCls} value={schedule.frequency} onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value as BackupConfig["schedule"]["frequency"] })}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sch-keep" className="mb-1 block text-xs text-muted">
                      Keep the last
                    </label>
                    <input id="sch-keep" type="number" min={1} max={60} className={inputCls} value={schedule.keep} onChange={(e) => setSchedule({ ...schedule, keep: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
                  </div>
                </div>
                <IncludeOptions idPrefix="sch" value={schedule.options} onChange={(o) => setSchedule({ ...schedule, options: o })} sections={data.sections} />
                <SchedulerHelp platform={platform} />
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={saveSchedule} loading={savingSchedule}>
                <Save className="size-4" aria-hidden /> Save schedule
              </Button>
              {data.config.schedule.enabled && (
                <Button variant="outline" onClick={runNow} loading={runningNow}>
                  <Play className="size-4" aria-hidden /> Run now
                </Button>
              )}
            </div>
            {data.config.lastRun && (
              <p className={cn("mt-3 text-xs", data.config.lastRun.ok ? "text-faint" : "text-warn")}>
                Last scheduled run: {data.config.lastRun.at ? new Date(data.config.lastRun.at).toLocaleString() : "—"} · {data.config.lastRun.message}
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* history */}
      <Card className="p-0 md:p-0">
        <div className="flex items-center justify-between gap-4 p-5 md:p-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Backups ({data.backups.length})</h2>
            <p className="mt-1 text-sm text-muted">Download, restore or delete. Auto snapshots are taken before every restore (last 10 kept).</p>
          </div>
        </div>
        {data.backups.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState title="No backups yet" text="Create your first backup above — it takes a few seconds." />
          </div>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {data.backups.map((b) => {
              const c = b.summary.counts;
              return (
                <li key={b.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", kindCls(b.kind))}>{KIND_LABEL[b.kind]}</span>
                      <span>{new Date(b.createdAt).toLocaleString()}</span>
                      {b.protected && <Lock className="size-3.5 text-accent-2" aria-label="Password-protected" />}
                    </p>
                    <p className="mt-1 truncate text-xs text-faint">
                      {b.label && <span className="text-muted">{b.label} · </span>}
                      {formatBytes(b.size)}
                      {c ? ` · ${c.sections} sections, ${c.items} items, ${c.media} media${c.bundled ? `, ${c.bundled} site files` : ""}${c.messages ? `, ${c.messages} messages` : ""}` : b.protected ? " · contents shown after you enter its password" : ""}
                      {b.summary.appVersion ? ` · v${b.summary.appVersion}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" onClick={() => setDownload(b)} aria-label={`Download backup from ${new Date(b.createdAt).toLocaleString()}`}>
                      <Download className="size-4" aria-hidden /> <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button variant="outline" onClick={() => setRestore(b)} aria-label={`Restore backup from ${new Date(b.createdAt).toLocaleString()}`}>
                      <RotateCcw className="size-4" aria-hidden /> <span className="hidden sm:inline">Restore</span>
                    </Button>
                    <Button variant="ghost" onClick={() => remove(b)} aria-label="Delete backup">
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <DownloadDialog backup={download} onClose={() => setDownload(null)} />
      <RestoreWizard
        backup={restore}
        onClose={() => setRestore(null)}
        onDone={() => {
          void load();
          router.refresh();
        }}
      />
    </div>
  );
}

function SchedulerHelp({ platform }: { platform: Platform }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/cron/backup` : "/api/cron/backup";
  if (platform.scheduler === "internal")
    return (
      <p className="flex gap-2 rounded-xl border border-line bg-white/[0.03] p-3 text-xs text-muted">
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden /> This server runs the schedule itself (checked every 15 minutes) — nothing else to set up. Optional: also call the cron URL below from an external service if your host sleeps when idle.
      </p>
    );
  return (
    <div className="space-y-2 rounded-xl border border-line bg-white/[0.03] p-3 text-xs text-muted">
      {platform.scheduler === "vercel-cron" ? (
        <p>Vercel Cron calls the backup URL once a day (configured in vercel.json). It only makes a backup when one is due.</p>
      ) : (
        <p>This host can&apos;t run timers, so call this URL from any cron service (GitHub Actions workflow included, cron-job.org, a server crontab):</p>
      )}
      <code className="block overflow-x-auto whitespace-nowrap rounded-lg bg-black/40 p-2 font-mono text-[11px] text-ink">curl -H &quot;Authorization: Bearer $CRON_SECRET&quot; {url}</code>
      {!platform.cronSecretSet && <p className="text-warn">Set a CRON_SECRET environment variable (16+ random characters) first — without it the URL refuses every call.</p>}
    </div>
  );
}

function Stat({ Icon, label, value, tone }: { Icon: typeof Archive; label: string; value: string; tone: "ok" | "warn" }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.025] p-4">
      <Icon className={cn("size-5 shrink-0", tone === "ok" ? "text-accent-2" : "text-warn")} aria-hidden />
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider text-faint">{label}</span>
        <span className="block truncate text-sm text-ink">{value}</span>
      </span>
    </li>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> <span>{children}</span>
    </p>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
function kindCls(k: BackupRecord["kind"]) {
  return k === "pre-restore" ? "bg-warn/15 text-warn" : k === "scheduled" ? "bg-accent-2/15 text-accent-2" : k === "uploaded" ? "bg-white/10 text-muted" : "bg-success/15 text-success";
}
function timeAgo(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
