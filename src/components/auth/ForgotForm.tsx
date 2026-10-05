"use client";
import { useState } from "react";
import { MailCheck, AlertTriangle, Send } from "lucide-react";
import { Button, inputCls } from "@/components/admin/ui";

export function ForgotForm({ kind }: { kind: "admin" | "tester" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError(kind === "admin" ? "Enter your admin email." : "Enter your username or email.");
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, kind }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send the link.");
      setState("sent");
    } catch (err) {
      setError(!navigator.onLine ? "You're offline. Reconnect and try again." : err instanceof Error ? err.message : "Couldn't send the link.");
      setState("idle");
    }
  }
  if (state === "sent")
    return (
      <div role="status" className="space-y-3 rounded-3xl border border-line bg-bg-2/80 p-6 text-sm text-muted md:p-8">
        <p className="flex items-center gap-2 font-medium text-ink">
          <MailCheck className="size-5 text-success" aria-hidden /> Check your inbox
        </p>
        <p>If that account exists, a reset link is on its way. It works once and expires in 30 minutes. Look in spam if you don&apos;t see it within a few minutes.</p>
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
        <label htmlFor="fp-email" className="mb-1.5 block text-sm text-muted">
          {kind === "admin" ? "Admin email" : "Username or email"}
        </label>
        <input id="fp-email" type={kind === "admin" ? "email" : "text"} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required autoFocus />
      </div>
      <Button type="submit" loading={state === "sending"} className="w-full py-3">
        <Send className="size-4" aria-hidden /> Email me a reset link
      </Button>
    </form>
  );
}
