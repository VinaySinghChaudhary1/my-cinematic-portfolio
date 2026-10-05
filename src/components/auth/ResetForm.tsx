"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";
import { Button, inputCls } from "@/components/admin/ui";

export function ResetForm({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"" | "admin" | "tester">("");
  const strong = pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!strong) return setError("Use at least 12 characters with upper-case, lower-case letters and numbers.");
    if (pw !== pw2) return setError("Passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw, confirmPassword: pw2 }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.fields?.password || d.error || "Couldn't reset the password.");
      setDone(d.kind === "tester" ? "tester" : "admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset the password.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div role="status" className="space-y-4 rounded-3xl border border-line bg-bg-2/80 p-6 text-sm text-muted md:p-8">
        <p className="flex items-center gap-2 font-medium text-ink">
          <CheckCircle2 className="size-5 text-success" aria-hidden /> Password changed
        </p>
        <p>All devices were signed out. Sign in with your new password.</p>
        <a href={done === "tester" ? "/beta" : "/admin/login"} className="block rounded-xl bg-accent px-4 py-3 text-center font-medium text-white">
          Go to sign in
        </a>
      </div>
    );
  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-line bg-bg-2/80 p-6 shadow-2xl backdrop-blur md:p-8">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      <div>
        <label htmlFor="np" className="mb-1.5 block text-sm text-muted">New password</label>
        <input id="np" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} autoFocus />
        <p className={`mt-1 text-xs ${strong ? "text-success" : "text-faint"}`}>12+ characters, upper-case, lower-case and a number.</p>
      </div>
      <div>
        <label htmlFor="np2" className="mb-1.5 block text-sm text-muted">Repeat new password</label>
        <input id="np2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} />
      </div>
      <Button type="submit" loading={busy} className="w-full py-3">
        <KeyRound className="size-4" aria-hidden /> Set new password
      </Button>
    </form>
  );
}
