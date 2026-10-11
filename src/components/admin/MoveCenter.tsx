"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownToLine, CheckCircle2, CircleHelp, Copy, Download, Globe, Info, KeyRound, Loader2, Search, Send, Server, XCircle } from "lucide-react";
import { targets, envTemplate, type TargetId } from "@/lib/move/targets";
import type { DomainCheck } from "@/lib/move/domain";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "./api";
import { Button, Card, Switch, inputCls } from "./ui";

export interface HostFacts {
  host: string;
  database: string;
  files: string;
  ephemeral: boolean;
  siteUrl: string;
  envSiteUrl: string;
  settingSiteUrl: string;
  email: boolean;
  google: boolean;
}

const fmtSize = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
const fmtTime = (t: number) => new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export function MoveCenter({ facts, active }: { facts: HostFacts; active: { expiresAt: number } | null }) {
  return (
    <div className="space-y-6">
      <ThisSite facts={facts} />
      <div className="grid gap-6 xl:grid-cols-2">
        <AddressCard facts={facts} />
        <DomainChecker defaultDomain={facts.siteUrl} />
      </div>
      <MovePlanner siteUrl={facts.siteUrl} />
      <Transfer active={active} />
    </div>
  );
}

/* ───────────── this site ───────────── */
function ThisSite({ facts }: { facts: HostFacts }) {
  const rows = [
    ["Hosted on", facts.host],
    ["Database", facts.database],
    ["Files (photos, PDFs)", facts.files],
    ["Website address", facts.siteUrl],
    ["Email (Resend)", facts.email ? "Set up" : "Not set up"],
    ["Google sign-in", facts.google ? "Set up" : "Not set up"],
  ];
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Server className="size-5 text-accent-2" aria-hidden /> This site now
      </h2>
      <p className="mt-1 text-sm text-muted">
        Your code never has to change to move: the same project runs on Vercel, a VPS, Docker, Hostinger or Render. A move is: deploy the code on the new host → set its environment variables →
        copy everything across with a transfer code → point your domain to it.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-white/[0.02] px-4 py-3">
            <dt className="text-[11px] uppercase tracking-wider text-faint">{k}</dt>
            <dd className="mt-0.5 truncate text-sm text-ink" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/* ───────────── website address ───────────── */
function AddressCard({ facts }: { facts: HostFacts }) {
  const [v, setV] = useState(facts.settingSiteUrl);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  async function save() {
    setSaving(true);
    setErr("");
    try {
      const r = await api<{ value: { siteUrl: string } }>("/api/admin/settings/domain", { method: "PUT", json: { siteUrl: v.trim() } });
      setV(r.value.siteUrl);
      toast.success(r.value.siteUrl ? `Website address set to ${r.value.siteUrl}` : "Using the server's SITE_URL again");
    } catch (e) {
      if (e instanceof ApiError && e.fields?.siteUrl) setErr(e.fields.siteUrl);
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Globe className="size-5 text-accent-2" aria-hidden /> Website address
      </h2>
      <p className="mt-1 text-sm text-muted">Change your domain here — no code, no redeploy. Emails, Google sign-in, the sitemap and share links follow it immediately.</p>
      <label htmlFor="site-url" className="mt-4 mb-1.5 block text-sm text-ink">
        Address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="site-url" value={v} onChange={(e) => setV(e.target.value)} placeholder={facts.envSiteUrl || "https://yourname.com"} className={inputCls} aria-invalid={!!err} />
        <Button onClick={save} loading={saving} className="shrink-0">
          Save
        </Button>
      </div>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
      <p className="mt-2 text-xs text-faint">Empty = use the server’s SITE_URL{facts.envSiteUrl ? ` (${facts.envSiteUrl})` : ""}.</p>
      <div className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-ink">
        <b>Order matters:</b> 1) add the new domain in your host and its DNS at the registrar → 2) Domain checker shows “Opens THIS site” → 3) save the new address here → 4) add it to Google Cloud
        (origins + redirect URI) and verify it in Resend if emails should come from it.
      </div>
    </Card>
  );
}

/* ───────────── domain checker ───────────── */
const ICON = {
  ok: <CheckCircle2 className="size-4 text-success" aria-label="OK" />,
  warn: <AlertTriangle className="size-4 text-warn" aria-label="Needs attention" />,
  fail: <XCircle className="size-4 text-danger" aria-label="Problem" />,
  info: <Info className="size-4 text-accent-2" aria-label="Info" />,
};

function DomainChecker({ defaultDomain }: { defaultDomain: string }) {
  const [domain, setDomain] = useState(() => {
    try {
      return new URL(defaultDomain).hostname;
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ host: string; checks: DomainCheck[] } | null>(null);
  async function check(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    try {
      setRes(await api<{ host: string; checks: DomainCheck[] }>("/api/admin/move/check", { method: "POST", json: { domain } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }
  const groups = useMemo(() => {
    const m = new Map<string, DomainCheck[]>();
    for (const c of res?.checks ?? []) m.set(c.group, [...(m.get(c.group) ?? []), c]);
    return [...m.entries()];
  }, [res]);
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Search className="size-5 text-accent-2" aria-hidden /> Domain checker
      </h2>
      <p className="mt-1 text-sm text-muted">Live check of DNS, HTTPS, email records and settings for any domain — before and after you switch.</p>
      <form onSubmit={check} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourname.com" aria-label="Domain" className={inputCls} />
        <Button type="submit" loading={busy} className="shrink-0">
          Check
        </Button>
      </form>
      {res && (
        <div className="mt-4 space-y-4">
          {groups.map(([g, list]) => (
            <div key={g}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{g}</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {list.map((c) => (
                  <li key={c.id} className="flex gap-3 px-3 py-2.5">
                    <span className="mt-0.5 shrink-0">{ICON[c.status]}</span>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-ink">{c.label}</p>
                      <p className="break-words text-xs text-muted">{c.detail}</p>
                      {c.fix && <p className="mt-1 text-xs text-ink/80">→ {c.fix}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ───────────── move planner ───────────── */
function MovePlanner({ siteUrl }: { siteUrl: string }) {
  const all = useMemo(() => targets(siteUrl), [siteUrl]);
  const [id, setId] = useState<TargetId>("vps");
  const t = all.find((x) => x.id === id)!;
  function download() {
    const blob = new Blob([envTemplate(t)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `env-${t.id}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Server className="size-5 text-accent-2" aria-hidden /> Move to another host — plan
      </h2>
      <p className="mt-1 text-sm text-muted">Pick where you want to go. You get the exact steps and the environment variables that host needs (names and hints only — you type the secret values into the host).</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="New host">
        {all.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={x.id === id}
            onClick={() => setId(x.id)}
            className={cn("rounded-xl border p-3 text-left transition", x.id === id ? "border-accent/70 bg-accent/10" : "border-line hover:border-accent/40")}
          >
            <span className="block text-sm font-medium text-ink">{x.label}</span>
            <span className="mt-0.5 block text-xs text-muted">{x.summary}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Steps</p>
          <ol className="mt-2 space-y-2">
            {t.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <Fact k="Database" v={t.database} />
            <Fact k="Files" v={t.files} />
            <Fact k="Cost" v={t.cost} />
          </div>
          <p className="mt-3 rounded-xl border border-line px-3 py-2 text-xs text-muted">
            <b className="text-ink">DNS at your registrar:</b> {t.dns}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Environment variables</p>
            <Button variant="outline" onClick={download} className="min-h-8 px-3 text-xs">
              <Download className="size-3.5" aria-hidden /> Download template
            </Button>
          </div>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {t.env.map((v) => (
              <li key={v.name} className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-xs font-semibold text-ink">{v.name}</code>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      v.need === "required" ? "bg-danger/15 text-danger" : v.need === "first-start" ? "bg-warn/15 text-warn" : v.need === "recommended" ? "bg-accent/15 text-accent-2" : "bg-white/10 text-muted",
                    )}
                  >
                    {v.need === "first-start" ? "first start" : v.need}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{v.hint}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-line px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-faint">{k}</p>
      <p className="text-ink">{v}</p>
    </div>
  );
}

/* ───────────── transfer ───────────── */
function Transfer({ active }: { active: { expiresAt: number } | null }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <KeyRound className="size-5 text-accent-2" aria-hidden /> Copy everything to the new site
      </h2>
      <p className="mt-1 text-sm text-muted">
        Sections, entries, designs, settings, photos, PDFs and your bundled files move in one go — no downloading or uploading files. Passwords, AI keys and testers are never copied: you
        sign in on the new site with ADMIN_EMAIL / ADMIN_PASSWORD and add AI keys there again.
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <SendSide active={active} />
        <ReceiveSide />
      </div>
    </Card>
  );
}

function SendSide({ active: initial }: { active: { expiresAt: number } | null }) {
  const [active, setActive] = useState(initial);
  const [ask, setAsk] = useState(false);
  const [pw, setPw] = useState("");
  const [msgs, setMsgs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<{ code: string; expiresAt: number; size: number } | null>(null);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ code: string; expiresAt: number; size: number }>("/api/admin/move/transfer", { method: "POST", json: { adminPassword: pw, includeMessages: msgs } });
      setCode(r);
      setActive({ expiresAt: r.expiresAt });
      setAsk(false);
      setPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the code");
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    try {
      await api("/api/admin/move/transfer", { method: "DELETE" });
      setActive(null);
      setCode(null);
      toast.success("Transfer code cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel");
    }
  }
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Send className="size-4 text-accent-2" aria-hidden /> On the OLD site (this one, if you are moving away)
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted">
        <li>Create a transfer code (a full backup is made first).</li>
        <li>Open the NEW site’s admin → this page → “Receive”, paste this site’s address and the code.</li>
      </ol>
      {code ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted">Transfer code — shown once, valid until {fmtTime(code.expiresAt)} ({fmtSize(code.size)}):</p>
          <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
            <code className="flex-1 break-all font-mono text-sm tracking-wider text-ink">{code.code}</code>
            <button
              type="button"
              aria-label="Copy code"
              onClick={() => navigator.clipboard.writeText(code.code).then(() => toast.success("Code copied"), () => toast.error("Copy failed — select it manually"))}
              className="text-muted hover:text-ink"
            >
              <Copy className="size-4" />
            </button>
          </div>
          <p className="text-xs text-faint">Anyone with this code and your site address can copy your site for 2 hours — share it with no one, cancel it when done.</p>
        </div>
      ) : active ? (
        <p className="mt-4 text-xs text-muted">A transfer code is active until {fmtTime(active.expiresAt)}. Its code was shown when it was made; create a new one if you lost it.</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => setAsk(true)}>
          <KeyRound className="size-4" aria-hidden /> {active ? "New transfer code" : "Create transfer code"}
        </Button>
        {active && (
          <Button variant="danger" onClick={cancel}>
            Cancel code
          </Button>
        )}
      </div>
      <Modal open={ask} onClose={() => setAsk(false)} title="Create a transfer code">
        <form onSubmit={create} className="space-y-4 p-5">
          <p className="text-sm text-muted">A full backup of this site is made and sealed with a one-time code that works for 2 hours. Confirm with your admin password.</p>
          <div>
            <label htmlFor="mv-pw" className="mb-1.5 block text-sm text-ink">
              Admin password
            </label>
            <input id="mv-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} required />
          </div>
          <label className="flex items-center gap-3 text-sm text-ink">
            <Switch checked={msgs} onChange={setMsgs} label="Include contact messages" /> Include contact messages
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAsk(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {busy ? "Making backup…" : "Create code"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ReceiveSide() {
  const [from, setFrom] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [done, setDone] = useState<{ name: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [busy]);
  async function pull(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDone(null);
    setError("");
    try {
      setProgress({ done: 0, total: 1, label: "Contacting the old site…" });
      const info = await api<{ pullId: string; parts: number; size: number; name: string; from: string }>("/api/admin/move/pull", { method: "POST", json: { action: "info", from, code } });
      for (let i = 0; i < info.parts; i++) {
        setProgress({ done: i, total: info.parts, label: `Copying part ${i + 1} of ${info.parts} (${fmtSize(info.size)} in total)…` });
        let tries = 0;
        for (;;) {
          try {
            await api("/api/admin/move/pull", { method: "POST", json: { action: "part", from: info.from, code, pullId: info.pullId, index: i } });
            break;
          } catch (err) {
            if (++tries >= 3 || (err instanceof ApiError && err.status === 400)) throw err;
            await new Promise((r) => setTimeout(r, 1500 * tries));
          }
        }
      }
      setProgress({ done: info.parts, total: info.parts, label: "Checking and unpacking…" });
      await api("/api/admin/move/pull", { method: "POST", json: { action: "finish", from: info.from, code, pullId: info.pullId, count: info.parts } });
      setDone({ name: info.name });
      toast.success("Everything copied — now restore it");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      setError(msg);
      toast.error(msg, { duration: 12000 });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ArrowDownToLine className="size-4 text-accent-2" aria-hidden /> Receive — on the NEW site
      </p>
      {done ? (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" aria-hidden /> {done.name}’s site was copied here.
          </p>
          <p className="text-sm text-muted">
            Last step: <b className="text-ink">Backups</b> → the newest entry “Moved from …” → <b className="text-ink">Restore</b> → preview → Restore everything. You can undo it there.
          </p>
          <Link href="/admin/backups" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white">
            Open Backups to restore
          </Link>
        </div>
      ) : (
        <form onSubmit={pull} className="mt-3 space-y-3">
          <div>
            <label htmlFor="mv-from" className="mb-1.5 block text-xs text-ink">
              Old site address
            </label>
            <input id="mv-from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="https://yourname.com" className={inputCls} required disabled={busy} />
          </div>
          <div>
            <label htmlFor="mv-code" className="mb-1.5 block text-xs text-ink">
              Transfer code
            </label>
            <input id="mv-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" className={cn(inputCls, "font-mono tracking-wider")} required autoComplete="off" disabled={busy} />
          </div>
          {progress && (
            <div aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                <Loader2 className="size-3 animate-spin" aria-hidden /> {progress.label}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {error}
            </p>
          )}
          <Button type="submit" loading={busy}>
            <ArrowDownToLine className="size-4" aria-hidden /> Copy the old site here
          </Button>
          <p className="flex items-start gap-1.5 text-xs text-faint">
            <CircleHelp className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Nothing on this site changes until you restore in Backups — and that can be undone.
          </p>
        </form>
      )}
    </div>
  );
}
