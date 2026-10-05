"use client";
import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, FlaskConical } from "lucide-react";
import { Button, inputCls } from "@/components/admin/ui";
import { GoogleButton } from "./AuthShell";

export function TesterLoginForm({ google, notice }: { google: boolean; notice?: string }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(notice ?? "");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!login || !password) return setError("Enter your username and password.");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/beta/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login, password }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Sign-in failed.");
      window.location.assign("/");
    } catch (err) {
      setPassword("");
      setError(!navigator.onLine ? "You're offline. Reconnect and try again." : err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-line bg-bg-2/80 p-6 shadow-2xl backdrop-blur md:p-8">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      <div>
        <label htmlFor="b-login" className="mb-1.5 block text-sm text-muted">Username or email</label>
        <input id="b-login" autoComplete="username" autoCapitalize="none" value={login} onChange={(e) => setLogin(e.target.value)} className={inputCls} autoFocus />
      </div>
      <div>
        <label htmlFor="b-pw" className="mb-1.5 block text-sm text-muted">Password</label>
        <div className="relative">
          <input id="b-pw" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-11`} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" loading={loading} className="w-full py-3">
        <FlaskConical className="size-4" aria-hidden /> Enter beta preview
      </Button>
      <p className="text-center text-sm">
        <a href="/auth/forgot?kind=tester" className="text-accent-2 hover:underline">Forgot your password?</a>
      </p>
      {google && (
        <>
          <div className="flex items-center gap-3 text-xs text-faint" aria-hidden>
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <GoogleButton href="/api/auth/google/start?intent=tester" />
          <p className="text-center text-[11px] text-faint">Use the Google account with the email your invite was sent to.</p>
        </>
      )}
    </form>
  );
}
