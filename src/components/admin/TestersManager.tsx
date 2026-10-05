"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Mail, MessageCircle, Plus, RotateCcw, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "./api";
import { Button, Card, Switch, inputCls } from "./ui";
import { cn } from "@/lib/utils";

interface Tester {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  canSeeDrafts: boolean;
  note: string;
  expiresAt: number | null;
  revokedAt: number | null;
  lastSeenAt: number | null;
  googleLinked: boolean;
  createdAt: number;
  status: "active" | "expired" | "revoked";
}
interface Invite {
  text: string;
  whatsapp: string;
  email: { ok: boolean; error?: string; skipped?: boolean } | null;
}
interface Creds {
  tester: Tester;
  password: string;
  invite: Invite;
}

const DAY = 86_400_000;
const EXPIRY = [
  { v: "7", label: "7 days" },
  { v: "14", label: "14 days" },
  { v: "30", label: "30 days" },
  { v: "custom", label: "Pick a date" },
  { v: "never", label: "No expiry" },
];
const fmt = (t: number | null) => (t ? new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const ago = (t: number | null) => {
  if (!t) return "Never";
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

const empty = { name: "", email: "", phone: "", username: "", expiry: "14", date: "", canSeeDrafts: true, note: "", sendEmail: true };

export function TestersManager({ emailReady, maintenance, betaSections }: { emailReady: boolean; maintenance: boolean; betaSections: number }) {
  const [list, setList] = useState<Tester[] | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [del, setDel] = useState<Tester | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList((await api<{ testers: Tester[] }>("/api/admin/testers")).testers);
    } catch (e) {
      toast.error((e as Error).message);
      setList([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function expiresAt(): number | null {
    if (form.expiry === "never") return null;
    if (form.expiry === "custom") return form.date ? new Date(`${form.date}T23:59:59`).getTime() : null;
    return Date.now() + Number(form.expiry) * DAY;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (form.expiry === "custom" && !form.date) return setErrors({ expiresAt: "Pick a date" });
    setSaving(true);
    setErrors({});
    try {
      const res = await api<Creds>("/api/admin/testers", {
        method: "POST",
        json: { name: form.name, email: form.email.trim(), phone: form.phone.trim(), username: form.username.trim(), expiresAt: expiresAt(), canSeeDrafts: form.canSeeDrafts, note: form.note, sendEmail: form.sendEmail && !!form.email.trim() },
      });
      setCreds(res);
      setForm(empty);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function act(t: Tester, what: "reset" | "revoke" | "restore" | "delete") {
    setBusy(`${t.id}:${what}`);
    try {
      if (what === "reset") {
        setCreds(await api<Creds>(`/api/admin/testers/${t.id}/reset`, { method: "POST", json: { sendEmail: !!t.email && emailReady } }));
      } else if (what === "delete") {
        await api(`/api/admin/testers/${t.id}`, { method: "DELETE" });
        setDel(null);
        toast.success(`${t.name} was removed`);
      } else {
        await api(`/api/admin/testers/${t.id}`, { method: "PATCH", json: { revoked: what === "revoke" } });
        toast.success(what === "revoke" ? `${t.name} can no longer sign in` : `${t.name} can sign in again`);
      }
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function extend(t: Tester, days: number) {
    setBusy(`${t.id}:extend`);
    try {
      await api(`/api/admin/testers/${t.id}`, { method: "PATCH", json: { expiresAt: Math.max(Date.now(), t.expiresAt ?? 0) + days * DAY } });
      toast.success(`Access extended by ${days} days`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Couldn't copy — select the text and copy it manually");
    }
  };

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-danger">{errors[k]}</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">How beta testing works</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>• Testers sign in at <b className="text-ink">/beta</b> with the username and password you create here (or with Google, using the email you enter).</li>
          <li>
            • While <b className="text-ink">Maintenance mode</b> is on, visitors see the maintenance page, but testers see the full site.{" "}
            <span className={maintenance ? "text-emerald-400" : "text-faint"}>Maintenance is {maintenance ? "ON" : "off"}</span> — change it in Site settings.
          </li>
          <li>
            • Sections switched to <b className="text-ink">Beta</b> in Sections & content are visible only to testers and you. <span className="text-faint">{betaSections} beta section{betaSections === 1 ? "" : "s"} now.</span>
          </li>
          <li>• Testers with “See drafts” can also preview draft and scheduled entries. They can send feedback from the bar at the top of the site — it arrives in Messages.</li>
          <li>• Testers can never open the admin panel. Revoking a tester signs them out immediately.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Add a tester</h2>
        <p className="mt-1 text-sm text-muted">A strong password is generated for them. You&apos;ll see it once, with buttons to send it by email or WhatsApp.</p>
        <form onSubmit={create} className="mt-5 grid gap-4 md:grid-cols-2" noValidate>
          <div>
            <label htmlFor="t-name" className="mb-1.5 block text-sm text-ink">Name *</label>
            <input id="t-name" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Rahul Sharma" />
            {err("name")}
          </div>
          <div>
            <label htmlFor="t-user" className="mb-1.5 block text-sm text-ink">Username <span className="text-faint">(optional)</span></label>
            <input id="t-user" value={form.username} onChange={(e) => set("username", e.target.value)} className={inputCls} placeholder="Made from the name if empty" autoComplete="off" />
            {err("username")}
          </div>
          <div>
            <label htmlFor="t-email" className="mb-1.5 block text-sm text-ink">Email</label>
            <input id="t-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="For the invite, password reset and Google sign-in" />
            {err("email")}
          </div>
          <div>
            <label htmlFor="t-phone" className="mb-1.5 block text-sm text-ink">WhatsApp number</label>
            <input id="t-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
            {err("phone")}
          </div>
          <div>
            <label htmlFor="t-exp" className="mb-1.5 block text-sm text-ink">Access ends</label>
            <div className="flex gap-2">
              <select id="t-exp" value={form.expiry} onChange={(e) => set("expiry", e.target.value)} className={inputCls}>
                {EXPIRY.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
              {form.expiry === "custom" && <input type="date" aria-label="Expiry date" value={form.date} min={new Date(Date.now() + DAY).toISOString().slice(0, 10)} onChange={(e) => set("date", e.target.value)} className={inputCls} />}
            </div>
            {err("expiresAt")}
          </div>
          <div>
            <label htmlFor="t-note" className="mb-1.5 block text-sm text-ink">Note <span className="text-faint">(only you see it)</span></label>
            <input id="t-note" value={form.note} onChange={(e) => set("note", e.target.value)} className={inputCls} placeholder="e.g. Testing mobile layout" />
          </div>
          <div className="flex flex-wrap items-center gap-6 md:col-span-2">
            <label className="flex items-center gap-3 text-sm text-ink">
              <Switch checked={form.canSeeDrafts} onChange={(v) => set("canSeeDrafts", v)} label="Can see drafts" /> Can see drafts & scheduled entries
            </label>
            <label className={cn("flex items-center gap-3 text-sm", form.email && emailReady ? "text-ink" : "text-faint")}>
              <Switch checked={form.sendEmail && !!form.email && emailReady} disabled={!form.email || !emailReady} onChange={(v) => set("sendEmail", v)} label="Email the invite" /> Email the invite
              {!emailReady && <span className="text-xs">(email isn&apos;t set up yet)</span>}
            </label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={saving}>
              <Plus className="size-4" aria-hidden /> Create tester
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Testers</h2>
        {list === null ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No testers yet. Add one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {list.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{t.name}</span>
                    <span className="text-xs text-faint">@{t.username}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        t.status === "active" && "bg-emerald-500/15 text-emerald-400",
                        t.status === "expired" && "bg-amber-500/15 text-amber-400",
                        t.status === "revoked" && "bg-danger/15 text-danger",
                      )}
                    >
                      {t.status}
                    </span>
                    {t.googleLinked && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">Google linked</span>}
                    {t.canSeeDrafts && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">Sees drafts</span>}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {[t.email, t.phone].filter(Boolean).join(" · ") || "No contact details"} · Ends {t.expiresAt ? fmt(t.expiresAt) : "never"} · Last seen {ago(t.lastSeenAt)}
                  </p>
                  {t.note && <p className="mt-0.5 truncate text-xs text-faint">{t.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.status !== "revoked" && (
                    <Button variant="outline" className="min-h-9 px-3 text-xs" loading={busy === `${t.id}:reset`} onClick={() => act(t, "reset")} title="Make a new password (the old one stops working)">
                      <KeyRound className="size-3.5" aria-hidden /> New password
                    </Button>
                  )}
                  {t.status === "expired" && (
                    <Button variant="outline" className="min-h-9 px-3 text-xs" loading={busy === `${t.id}:extend`} onClick={() => extend(t, 7)}>
                      <RotateCcw className="size-3.5" aria-hidden /> +7 days
                    </Button>
                  )}
                  {t.status === "revoked" ? (
                    <Button variant="outline" className="min-h-9 px-3 text-xs" loading={busy === `${t.id}:restore`} onClick={() => act(t, "restore")}>
                      <UserCheck className="size-3.5" aria-hidden /> Restore
                    </Button>
                  ) : (
                    <Button variant="outline" className="min-h-9 px-3 text-xs" loading={busy === `${t.id}:revoke`} onClick={() => act(t, "revoke")}>
                      <ShieldOff className="size-3.5" aria-hidden /> Revoke
                    </Button>
                  )}
                  <Button variant="danger" className="min-h-9 px-3 text-xs" onClick={() => setDel(t)} aria-label={`Delete ${t.name}`}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!creds} onClose={() => setCreds(null)} title="Tester login details">
        {creds && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Save or send these now — <b className="text-ink">the password won&apos;t be shown again</b>. You can always make a new one.
            </p>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-black/20 p-4 text-sm">
              <span className="text-faint">Username</span>
              <code className="truncate text-ink">{creds.tester.username}</code>
              <button type="button" onClick={() => copy(creds.tester.username, "Username")} className="text-muted hover:text-ink" aria-label="Copy username"><Copy className="size-4" /></button>
              <span className="text-faint">Password</span>
              <code className="truncate text-ink">{creds.password}</code>
              <button type="button" onClick={() => copy(creds.password, "Password")} className="text-muted hover:text-ink" aria-label="Copy password"><Copy className="size-4" /></button>
            </div>
            {creds.invite.email && (
              <p className={cn("flex items-start gap-2 text-sm", creds.invite.email.ok ? "text-emerald-400" : "text-amber-400")}>
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                {creds.invite.email.ok ? `Invite emailed to ${creds.tester.email}.` : `Email not sent: ${creds.invite.email.error}`}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <a href={creds.invite.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-medium text-black hover:brightness-110">
                <MessageCircle className="size-4" aria-hidden /> Send on WhatsApp
              </a>
              <Button variant="outline" onClick={() => copy(creds.invite.text, "Invite message")}>
                <Copy className="size-4" aria-hidden /> Copy message
              </Button>
              <Button variant="ghost" onClick={() => setCreds(null)}>Done</Button>
            </div>
            {!creds.tester.phone && <p className="text-xs text-faint">No WhatsApp number saved — WhatsApp will ask you to pick a contact.</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete tester?">
        {del && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{del.name} will be signed out and can&apos;t sign in again. Their feedback messages stay in Messages.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button>
              <Button variant="danger" loading={busy === `${del.id}:delete`} onClick={() => act(del, "delete")}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
