"use client";
import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError, formatBytes } from "../api";
import { Button, Switch, inputCls } from "../ui";
import type { BackupRecord } from "./types";

const MIN = 10;

/** Downloads a backup in parts (fits every host's response limit) and joins them in the browser. */
export function DownloadDialog({ backup, onClose }: { backup: BackupRecord | null; onClose: () => void }) {
  const [encrypt, setEncrypt] = useState(true);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [admin, setAdmin] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const close = () => {
    if (busy) return;
    setPw("");
    setPw2("");
    setAdmin("");
    setErrors({});
    setProgress(0);
    onClose();
  };

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!backup) return;
    const errs: Record<string, string> = {};
    const wantEnc = encrypt && !backup.protected;
    if (wantEnc && pw.length < MIN) errs.pw = `Use at least ${MIN} characters`;
    if (wantEnc && pw !== pw2) errs.pw2 = "Passwords don't match";
    if (!admin) errs.admin = "Enter your admin password";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setProgress(0);
    try {
      const prep = await api<{ token: string; parts: number; size: number; filename: string }>(`/api/admin/backups/${backup.id}/download`, {
        method: "POST",
        json: { adminPassword: admin, encryptPassword: wantEnc ? pw : undefined },
      });
      const chunks: ArrayBuffer[] = [];
      for (let i = 0; i < prep.parts; i++) {
        const res = await fetch(`/api/admin/backups/download?t=${encodeURIComponent(prep.token)}&part=${i}`, { credentials: "same-origin" });
        if (!res.ok) throw new ApiError((await res.json().catch(() => ({}))).error || "Download failed", res.status);
        chunks.push(await res.arrayBuffer());
        setProgress(Math.round(((i + 1) / prep.parts) * 100));
      }
      const blob = new Blob(chunks, { type: "application/octet-stream" });
      if (blob.size !== prep.size) throw new Error("The download was incomplete. Please try again.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = prep.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`Saved ${prep.filename} (${formatBytes(prep.size)})`);
      setBusy(false);
      close();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.fields?.adminPassword) setErrors({ admin: err.fields.adminPassword });
      else toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  return (
    <Modal open={!!backup} onClose={close} title="Download backup">
      {backup && (
        <form onSubmit={start} className="space-y-5 p-6" noValidate>
          <p className="text-sm text-muted">
            {formatBytes(backup.size)} · {new Date(backup.createdAt).toLocaleString()}
          </p>
          {backup.protected ? (
            <p className="flex items-start gap-2 rounded-xl border border-line bg-white/[0.03] p-3 text-sm text-muted">
              <Lock className="mt-0.5 size-4 shrink-0 text-accent-2" aria-hidden /> This file is already password-protected with the password it was created with.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="dl-enc" className="text-sm text-ink">
                  Protect with a password <span className="block text-xs text-faint">Recommended. AES-256 encryption — nobody can open the file without it.</span>
                </label>
                <Switch id="dl-enc" label="Protect with a password" checked={encrypt} onChange={setEncrypt} />
              </div>
              {encrypt && (
                <>
                  <div>
                    <label htmlFor="dl-pw" className="mb-1 block text-xs text-muted">
                      Backup password (min {MIN} characters)
                    </label>
                    <input id="dl-pw" type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!errors.pw} />
                    {errors.pw && <p className="mt-1 text-xs text-danger">{errors.pw}</p>}
                  </div>
                  <div>
                    <label htmlFor="dl-pw2" className="mb-1 block text-xs text-muted">
                      Repeat password
                    </label>
                    <input id="dl-pw2" type="password" autoComplete="new-password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} aria-invalid={!!errors.pw2} />
                    {errors.pw2 && <p className="mt-1 text-xs text-danger">{errors.pw2}</p>}
                  </div>
                  <p className="text-xs text-warn">Keep this password safe — it cannot be recovered, and without it the backup can&apos;t be restored.</p>
                </>
              )}
            </div>
          )}
          <div>
            <label htmlFor="dl-admin" className="mb-1 block text-xs text-muted">
              Your admin password (confirms it&apos;s you)
            </label>
            <input id="dl-admin" type="password" autoComplete="current-password" className={inputCls} value={admin} onChange={(e) => setAdmin(e.target.value)} aria-invalid={!!errors.admin} />
            {errors.admin && <p className="mt-1 text-xs text-danger">{errors.admin}</p>}
          </div>
          {busy && (
            <div aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-faint">{progress < 100 ? `Preparing & downloading… ${progress}%` : "Saving…"}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              <ShieldCheck className="size-4" aria-hidden /> Download
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
