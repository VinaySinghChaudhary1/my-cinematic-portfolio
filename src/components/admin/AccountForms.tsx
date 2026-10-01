"use client";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, LogOut } from "lucide-react";
import { api, ApiError } from "./api";
import { Button, Card, inputCls } from "./ui";

function strength(p: string) {
  let s = 0;
  if (p.length >= 12) s++;
  if (p.length >= 16) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export function AccountForms() {
  const [v, setV] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const s = strength(v.newPassword);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (v.newPassword !== v.confirmPassword) return setErrors({ confirmPassword: "Passwords don't match" });
    setSaving(true);
    try {
      await api("/api/admin/account/password", { method: "POST", json: v });
      toast.success("Password changed. Other devices have been signed out.");
      setV({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  async function logoutAll() {
    if (!confirm("Sign out of every device, including this one?")) return;
    setLoggingOut(true);
    try {
      await api("/api/admin/account/logout-all", { method: "POST" });
      window.location.assign("/admin/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setLoggingOut(false);
    }
  }

  const field = (k: keyof typeof v, label: string, auto: string) => (
    <div>
      <label htmlFor={k} className="mb-1.5 block text-sm font-medium text-ink/90">
        {label}
      </label>
      <input id={k} type="password" autoComplete={auto} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : undefined} className={inputCls} />
      {errors[k] && (
        <p id={`${k}-err`} role="alert" className="mt-1 text-xs text-danger">
          ⚠ {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <KeyRound className="size-5 text-accent-2" aria-hidden /> Change password
        </h2>
        <form onSubmit={change} className="mt-5 space-y-4">
          {field("currentPassword", "Current password", "current-password")}
          {field("newPassword", "New password", "new-password")}
          {v.newPassword && (
            <div aria-live="polite">
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < s ? (s >= 4 ? "bg-success" : s >= 3 ? "bg-warn" : "bg-danger") : "bg-white/10"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-faint">Strength: {["very weak", "weak", "fair", "good", "strong", "excellent"][s]} — at least 12 characters with upper/lower-case and numbers.</p>
            </div>
          )}
          {field("confirmPassword", "Confirm new password", "new-password")}
          <div className="flex justify-end">
            <Button type="submit" loading={saving} disabled={!v.currentPassword || !v.newPassword}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <LogOut className="size-5 text-accent-2" aria-hidden /> Sessions
        </h2>
        <p className="mt-2 text-sm text-muted">Sessions last 7 days. If you signed in on a shared computer, sign out everywhere.</p>
        <Button variant="danger" className="mt-5" onClick={logoutAll} loading={loggingOut}>
          Sign out of all devices
        </Button>
        <div className="mt-6 rounded-xl border border-line bg-black/20 p-4 text-xs leading-relaxed text-muted">
          <p className="font-medium text-ink">Forgot your password?</p>
          There is no email reset (no email service is connected). With access to the server/project folder run:
          <code className="mt-2 block rounded bg-white/5 p-2 font-mono text-[11px] text-ink">npm run admin:reset-password -- you@example.com &quot;NewPassword123&quot;</code>
        </div>
      </Card>
    </div>
  );
}
