"use client";
import { useState } from "react";
import { FlaskConical, Eye, EyeOff, MessageSquarePlus, LogOut, ShieldCheck, ChevronDown, Send, X } from "lucide-react";

interface Props {
  kind: "tester" | "admin";
  name: string;
  maintenance: boolean;
  canPreview: boolean;
  previewOn: boolean;
  drafts: number;
  betaSections: number;
}

/** Small control bar for the owner and beta testers: what they're seeing, drafts preview, feedback, sign out. */
export function AccessBar(p: Props) {
  const [open, setOpen] = useState(p.kind === "tester");
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState(false);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Something went wrong");
    return d;
  }
  async function togglePreview() {
    setBusy(true);
    try {
      await post("/api/preview", { on: !p.previewOn });
      window.location.reload();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    await post("/api/beta/logout", {}).catch(() => {});
    window.location.assign("/");
  }
  async function sendFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (msg.trim().length < 3) return setNote("Write a little more.");
    setBusy(true);
    try {
      await post("/api/beta/feedback", { message: msg, page: location.pathname + location.hash });
      setMsg("");
      setFb(false);
      setNote("Thanks — your feedback was sent.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setBusy(false);
    }
  }

  const label = p.kind === "tester" ? `Beta preview · ${p.name}` : p.maintenance ? "Maintenance ON — only you & testers see the site" : "Owner view";
  const Icon = p.kind === "tester" ? FlaskConical : ShieldCheck;
  return (
    <div className="fixed left-1/2 top-[4.6rem] z-[70] w-[min(94vw,620px)] -translate-x-1/2 text-xs">
      <div className="rounded-2xl border border-warn/40 bg-bg-2/95 shadow-2xl backdrop-blur">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-2 text-left text-warn">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate font-medium">{label}</span>
          {p.previewOn && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-ink">drafts shown</span>}
          <ChevronDown className={`size-4 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open && (
          <div className="space-y-2 border-t border-line px-4 py-3 text-muted">
            <p>
              {p.kind === "tester" ? "You're testing the site before it goes public." : "You see everything visitors see, plus beta-only sections."}
              {p.betaSections > 0 && ` ${p.betaSections} beta-only section${p.betaSections > 1 ? "s" : ""} shown.`}
              {p.maintenance && p.kind === "tester" && " Visitors currently see the maintenance page."}
            </p>
            <div className="flex flex-wrap gap-2">
              {p.canPreview && (
                <button type="button" disabled={busy} onClick={togglePreview} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-ink hover:border-accent">
                  {p.previewOn ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
                  {p.previewOn ? "Hide drafts" : `Show drafts & scheduled${p.drafts ? ` (${p.drafts})` : ""}`}
                </button>
              )}
              {p.kind === "tester" && (
                <>
                  <button type="button" onClick={() => setFb((f) => !f)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-ink hover:border-accent">
                    <MessageSquarePlus className="size-3.5" aria-hidden /> Send feedback
                  </button>
                  <button type="button" disabled={busy} onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-ink hover:border-danger">
                    <LogOut className="size-3.5" aria-hidden /> Sign out
                  </button>
                </>
              )}
              {p.kind === "admin" && (
                <a href="/admin" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-ink hover:border-accent">
                  Open admin
                </a>
              )}
            </div>
            {fb && (
              <form onSubmit={sendFeedback} className="space-y-2">
                <label htmlFor="beta-fb" className="sr-only">Your feedback</label>
                <textarea id="beta-fb" rows={4} maxLength={4000} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="What works, what's broken, what's confusing? The page you're on is attached automatically." className="w-full rounded-xl border border-line bg-bg/60 p-3 text-sm text-ink outline-none focus:border-accent" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setFb(false)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:text-ink">
                    <X className="size-3.5" aria-hidden /> Cancel
                  </button>
                  <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-medium text-white">
                    <Send className="size-3.5" aria-hidden /> Send
                  </button>
                </div>
              </form>
            )}
            {note && (
              <p role="status" className="text-ink">
                {note}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
