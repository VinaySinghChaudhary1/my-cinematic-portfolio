"use client";
import { useState } from "react";
import { Eye, EyeOff, Lock, AlertTriangle, Clock } from "lucide-react";
import { Button, inputCls } from "./ui";

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError("Enter your email and password.");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sign-in failed.");
      window.location.assign(next); // full navigation so the new cookie is used everywhere
    } catch (err) {
      setPassword("");
      setError(!navigator.onLine ? "You're offline. Reconnect and try again." : err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-line bg-bg-2/80 p-6 shadow-2xl backdrop-blur md:p-8">
      {expired && !error && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2.5 text-sm text-warn">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden /> Your session expired. Please sign in again to continue.
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-muted">
          Email
        </label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required autoFocus />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-muted">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} pr-11`}
            required
          />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" loading={loading} className="w-full py-3">
        <Lock className="size-4" aria-hidden /> Sign in
      </Button>
      <p className="text-center text-xs text-faint">
        Forgot your password? Run <code className="rounded bg-white/5 px-1">npm run admin:reset-password</code> on the server.
      </p>
    </form>
  );
}
