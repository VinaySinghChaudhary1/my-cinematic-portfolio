"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const suggestions = (n: string) => [`What is ${n} studying?`, "Which projects stand out?", "What are the main skills?", `How can I contact ${n}?`];

/** Renders plain text with https:// links clickable (no HTML from the model is ever rendered). */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent-2 underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** Floating "Ask about me" chat. Conversations live only in this tab — nothing is saved on the server. */
export function AskChat({ name, greeting, beta }: { name: string; greeting: string; beta: boolean }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const first = name.split(/\s+/)[0] || name;

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setError("");
    setQ("");
    const history = turns;
    setTurns([...history, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text, history: history.slice(-8) }) });
      const j = (await res.json().catch(() => ({}))) as { answer?: string; error?: string };
      if (!res.ok || !j.answer) throw new Error(j.error || "The assistant can't answer right now.");
      setTurns((t) => [...t, { role: "assistant", content: j.answer! }]);
    } catch (e) {
      setError(navigator.onLine ? (e as Error).message : "You're offline.");
      setTurns(history); // let them retry the same question
      setQ(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ask-chat"
        className={cn(
          "fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-sm font-medium text-white shadow-[0_10px_40px_-10px_var(--accent)] transition hover:brightness-110",
          open && "sm:opacity-0 sm:pointer-events-none",
        )}
      >
        {open ? <X className="size-4" aria-hidden /> : <MessageCircleQuestion className="size-4" aria-hidden />}
        <span className={cn(open && "sr-only")}>Ask about {first}</span>
      </button>

      {open && (
        <section
          id="ask-chat"
          role="dialog"
          aria-label={`Ask about ${name}`}
          className="fixed inset-x-3 bottom-20 z-[85] flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-line bg-[#0b0a1a]/95 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold text-ink">Ask about {first}</p>
              <p className="text-[11px] text-faint">AI answers from this website only{beta ? " · beta" : ""}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink">
              <X className="size-4" />
            </button>
          </header>

          <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
            <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-3 py-2 text-ink">{greeting}</p>
            {turns.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions(first).map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent/60 hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <p
                key={i}
                className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2", t.role === "user" ? "ml-auto rounded-tr-sm bg-accent/25 text-ink" : "rounded-tl-sm bg-white/[0.06] text-ink")}
              >
                {t.role === "assistant" ? <Linked text={t.content} /> : t.content}
              </p>
            ))}
            {busy && (
              <p className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Thinking…
              </p>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="flex items-end gap-2 border-t border-line p-3"
          >
            <textarea
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 500))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(q);
                }
              }}
              rows={1}
              placeholder="Type your question…"
              aria-label="Your question"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none"
            />
            <button type="submit" disabled={busy || q.trim().length < 2} aria-label="Send" className="grid size-10 place-items-center rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white disabled:opacity-40">
              <Send className="size-4" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
