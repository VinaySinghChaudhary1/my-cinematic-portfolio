"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, KeyRound, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { api, ApiError } from "../api";
import { Button, Switch, inputCls } from "../ui";
import type { BackupRecord, Preview, RestoreReport } from "./types";

type Step = "password" | "loading" | "preview" | "confirm" | "running" | "done";

/**
 * Restore flow: (password) → verify + preview → choose what to restore → confirm with admin password + "RESTORE"
 * → report with Undo (restores the automatic snapshot taken just before).
 */
export function RestoreWizard({ backup, onClose, onDone }: { backup: BackupRecord | null; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>("loading");
  const [backupPw, setBackupPw] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"all" | "some">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState(true);
  const [media, setMedia] = useState(true);
  const [messages, setMessages] = useState(false);
  const [admin, setAdmin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (!backup) return;
    setError("");
    setPreview(null);
    setReport(null);
    setAdmin("");
    setConfirm("");
    setBackupPw("");
    if (backup.protected) setStep("password");
    else void inspect("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backup?.id]);

  async function inspect(pw: string) {
    if (!backup) return;
    setStep("loading");
    setError("");
    try {
      const r = await api<{ preview: Preview }>(`/api/admin/backups/${backup.id}/inspect`, { method: "POST", json: { backupPassword: pw || undefined } });
      setPreview(r.preview);
      setPicked(new Set(r.preview.sections.map((s) => s.key)));
      setSettings(r.preview.settingsGroups.length > 0);
      setMedia(r.preview.media.total > 0);
      setMessages(false);
      setMode("all");
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the backup");
      setStep(backup.protected ? "password" : "preview");
    }
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!backup || !preview) return;
    setStep("running");
    setError("");
    try {
      const r = await api<{ report: RestoreReport }>(`/api/admin/backups/${backup.id}/restore`, {
        method: "POST",
        json: {
          backupPassword: backupPw || undefined,
          adminPassword: admin,
          confirm,
          scope: { sections: mode === "all" ? "all" : [...picked], settings, media, messages },
        },
      });
      setReport(r.report);
      setStep("done");
      toast.success("Restore complete");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.fields ? [err.message, ...Object.values(err.fields)].join("\n") : err instanceof Error ? err.message : "Restore failed");
      setStep("confirm");
    }
  }

  async function undo() {
    if (!report) return;
    setUndoing(true);
    try {
      await api(`/api/admin/backups/${report.snapshotId}/restore`, {
        method: "POST",
        json: { adminPassword: admin, confirm: "RESTORE", scope: { sections: "all", settings: true, media: false, messages: false } },
      });
      toast.success("Undone — the site is back to how it was before the restore.");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Undo failed — use the Auto snapshot in the list.");
    } finally {
      setUndoing(false);
    }
  }

  const close = () => {
    if (step === "running" || undoing) return;
    onClose();
  };
  const scopeEmpty = mode === "some" && picked.size === 0 && !settings && !media && !messages;

  return (
    <Modal open={!!backup} onClose={close} title={step === "done" ? "Restore complete" : "Restore backup"} wide>
      {backup && (
        <div className="space-y-5 p-6">
          {error && (
            <p role="alert" className="whitespace-pre-line rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          )}

          {step === "password" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void inspect(backupPw);
              }}
              className="space-y-4"
            >
              <p className="flex items-center gap-2 text-sm text-muted">
                <KeyRound className="size-4 text-accent-2" aria-hidden /> This backup is password-protected. Enter the password it was saved with.
              </p>
              <input type="password" autoFocus autoComplete="off" className={inputCls} value={backupPw} onChange={(e) => setBackupPw(e.target.value)} aria-label="Backup password" />
              <div className="flex justify-end">
                <Button type="submit" disabled={!backupPw}>
                  Open backup <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </form>
          )}

          {(step === "loading" || step === "running") && (
            <p className="flex items-center gap-3 py-10 text-sm text-muted" aria-live="polite">
              <RotateCcw className="size-5 animate-spin text-accent-2" aria-hidden />
              {step === "loading" ? "Verifying every file in the backup…" : "Restoring — the site shows a maintenance screen until this finishes…"}
            </p>
          )}

          {step === "preview" && preview && (
            <>
              <ul className="grid gap-3 text-sm sm:grid-cols-3">
                <Info label="Backup made" value={new Date(preview.manifest.createdAt).toLocaleString()} />
                <Info label="Site version" value={`v${preview.manifest.appVersion}`} />
                <Info label="From" value={preview.manifest.siteUrl || "—"} />
              </ul>
              {preview.manifest.warnings.length > 0 && (
                <details className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
                  <summary>{preview.manifest.warnings.length} warning(s) recorded when this backup was made</summary>
                  <ul className="mt-2 list-disc pl-5">
                    {preview.manifest.warnings.slice(0, 20).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink">Sections</legend>
                <div className="flex flex-wrap gap-2 text-sm">
                  {(["all", "some"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mode === m}
                      onClick={() => setMode(m)}
                      className={cn("rounded-full border px-3 py-1.5", mode === m ? "border-accent-2/60 bg-accent-2/10 text-ink" : "border-line text-muted")}
                    >
                      {m === "all" ? "Replace all sections" : "Only the sections I pick"}
                    </button>
                  ))}
                </div>
                <div className="max-h-64 overflow-auto rounded-xl border border-line">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-bg-2 text-left text-xs text-faint">
                      <tr>
                        {mode === "some" && <th className="w-10 px-3 py-2" />}
                        <th className="px-3 py-2 font-normal">Section</th>
                        <th className="px-3 py-2 text-right font-normal">Now</th>
                        <th className="px-3 py-2 text-right font-normal">In backup</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {preview.sections.map((s) => (
                        <tr key={s.key}>
                          {mode === "some" && (
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                aria-label={`Restore ${s.title}`}
                                checked={picked.has(s.key)}
                                onChange={() => setPicked((p) => {
                                  const n = new Set(p);
                                  if (n.has(s.key)) n.delete(s.key);
                                  else n.add(s.key);
                                  return n;
                                })}
                              />
                            </td>
                          )}
                          <td className="px-3 py-2 text-ink">
                            {s.title} {!s.enabled && <span className="text-xs text-faint">(hidden)</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-muted">{s.currentItems === null ? "new" : s.currentItems}</td>
                          <td className="px-3 py-2 text-right text-ink">{s.backupItems}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mode === "all" && preview.removedIfAll.length > 0 && (
                  <p className="text-xs text-warn">Not in this backup, so they will be removed: {preview.removedIfAll.map((s) => s.title).join(", ")}.</p>
                )}
              </fieldset>

              <ul className="divide-y divide-line rounded-xl border border-line">
                <Toggle id="rs-settings" label="Site settings" help={preview.settingsGroups.length ? `${preview.settingsGroups.length} groups (profile, socials, SEO…). Maintenance mode is never changed.` : "Not in this backup"} checked={settings} onChange={setSettings} disabled={!preview.settingsGroups.length} />
                <Toggle id="rs-media" label="Media files" help={preview.media.total ? `${preview.media.total} files · ${preview.media.alreadyHere} already here (kept), ${preview.media.total - preview.media.alreadyHere} to upload` : "Not in this backup"} checked={media} onChange={setMedia} disabled={!preview.media.total} />
                <Toggle id="rs-msg" label="Contact messages" help={preview.messages.total ? `${preview.messages.new} new of ${preview.messages.total} — added, never deleted` : "Not in this backup"} checked={messages} onChange={setMessages} disabled={!preview.messages.total} />
              </ul>
              {preview.bundled.missingHere > 0 && <p className="text-xs text-muted">{preview.bundled.missingHere} bundled file(s) aren&apos;t part of this deployment — they&apos;ll be uploaded to storage automatically.</p>}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={() => setStep("confirm")} disabled={scopeEmpty}>
                  Continue <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </>
          )}

          {step === "confirm" && preview && (
            <form onSubmit={run} className="space-y-4">
              <p className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  This replaces {mode === "all" ? "all sections" : `${picked.size} section(s)`}
                  {settings ? " and site settings" : ""}. A snapshot of the current site is saved first, so you can undo it.
                </span>
              </p>
              <div>
                <label htmlFor="rs-admin" className="mb-1 block text-xs text-muted">
                  Your admin password
                </label>
                <input id="rs-admin" type="password" autoComplete="current-password" className={inputCls} value={admin} onChange={(e) => setAdmin(e.target.value)} />
              </div>
              <div>
                <label htmlFor="rs-confirm" className="mb-1 block text-xs text-muted">
                  Type <strong className="text-ink">RESTORE</strong> to confirm
                </label>
                <input id="rs-confirm" autoComplete="off" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep("preview")}>
                  Back
                </Button>
                <Button type="submit" variant="danger" disabled={!admin || confirm.trim().toUpperCase() !== "RESTORE"}>
                  Restore now
                </Button>
              </div>
            </form>
          )}

          {step === "done" && report && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-5" aria-hidden /> The site now matches the backup.
              </p>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                <Info label="Sections restored" value={`${report.sections} (${report.items} items)`} />
                <Info label="Settings groups" value={String(report.settingsGroups)} />
                <Info label="Media" value={`${report.mediaAdded} added · ${report.mediaReused} kept`} />
                <Info label="Bundled files uploaded" value={String(report.bundledUploaded)} />
                {report.messagesAdded > 0 && <Info label="Messages added" value={String(report.messagesAdded)} />}
              </ul>
              {report.warnings.length > 0 && (
                <ul className="list-disc space-y-1 rounded-xl border border-warn/40 bg-warn/10 p-3 pl-8 text-xs text-warn">
                  {report.warnings.slice(0, 20).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={undo} loading={undoing}>
                  <Undo2 className="size-4" aria-hidden /> Undo this restore
                </Button>
                <Button onClick={() => window.open("/", "_blank", "noopener")}>View site</Button>
                <Button variant="ghost" onClick={close}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <li className="list-none rounded-xl border border-line bg-white/[0.02] px-3 py-2">
      <span className="block text-[11px] uppercase tracking-wider text-faint">{label}</span>
      <span className="block truncate text-ink" title={value}>
        {value}
      </span>
    </li>
  );
}

function Toggle({ id, label, help, checked, onChange, disabled }: { id: string; label: string; help: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <label htmlFor={id}>
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-faint">{help}</span>
      </label>
      <Switch id={id} label={label} checked={checked && !disabled} onChange={onChange} disabled={disabled} />
    </li>
  );
}
