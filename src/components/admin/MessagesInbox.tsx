"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Trash2, Reply, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { Spinner, EmptyState, ErrorState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { api } from "./api";
import { Button } from "./ui";

interface Msg {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: number;
}

export function MessagesInbox() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    setError("");
    try {
      setMsgs((await api<{ messages: Msg[] }>("/api/admin/messages")).messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function setRead(m: Msg, read: boolean) {
    setMsgs((l) => l?.map((x) => (x.id === m.id ? { ...x, read } : x)) ?? null);
    try {
      await api(`/api/admin/messages/${m.id}`, { method: "PATCH", json: { read } });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
      load();
    }
  }
  async function remove(m: Msg) {
    if (!confirm(`Delete the message from ${m.name}?`)) return;
    try {
      await api(`/api/admin/messages/${m.id}`, { method: "DELETE" });
      setMsgs((l) => l?.filter((x) => x.id !== m.id) ?? null);
      toast.success("Message deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  if (error) return <ErrorState text={error} onRetry={load} />;
  if (!msgs) return <Spinner label="Loading messages…" />;
  if (msgs.length === 0) return <EmptyState icon={<Mail className="size-5" />} title="No messages yet" text="When someone uses the contact form on your site, their message will appear here." />;
  const shown = filter === "unread" ? msgs.filter((m) => !m.read) : msgs;

  return (
    <div>
      <div role="group" aria-label="Filter" className="mb-4 flex gap-1">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("rounded-lg px-3 py-2 text-sm capitalize", filter === f ? "bg-white/10 text-ink" : "text-muted hover:text-ink")}>
            {f} {f === "unread" && `(${msgs.filter((m) => !m.read).length})`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="All caught up" text="No unread messages." />
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => {
            const open = openId === m.id;
            return (
              <li key={m.id} className={cn("rounded-2xl border bg-white/[0.025]", m.read ? "border-line" : "border-accent/40")}>
                <button
                  className="flex w-full items-start gap-3 p-4 text-left"
                  aria-expanded={open}
                  onClick={() => {
                    setOpenId(open ? null : m.id);
                    if (!m.read) setRead(m, true);
                  }}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", m.read ? "bg-transparent" : "bg-accent")} aria-label={m.read ? undefined : "Unread"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className={cn("text-sm", m.read ? "text-muted" : "font-semibold text-ink")}>
                        {m.name} <span className="font-normal text-faint">&lt;{m.email}&gt;</span>
                      </span>
                      <span className="text-xs text-faint">{new Date(m.createdAt).toLocaleString()}</span>
                    </span>
                    <span className="block truncate text-sm text-muted">{m.subject || m.body.slice(0, 120)}</span>
                  </span>
                </button>
                {open && (
                  <div className="border-t border-line p-4">
                    {m.subject && <p className="mb-2 text-sm font-medium text-ink">{m.subject}</p>}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{m.body}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent("Re: " + (m.subject || "your message"))}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-bg"
                      >
                        <Reply className="size-4" aria-hidden /> Reply by email
                      </a>
                      <Button variant="outline" onClick={() => setRead(m, false)}>
                        <MailOpen className="size-4" aria-hidden /> Mark unread
                      </Button>
                      <Button variant="danger" onClick={() => remove(m)}>
                        <Trash2 className="size-4" aria-hidden /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
