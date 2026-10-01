"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Pencil, Menu as MenuIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "./api";
import { Button, Switch } from "./ui";

interface Row {
  key: string;
  title: string;
  type: string;
  typeLabel: string;
  description: string;
  enabled: boolean;
  showInNav: boolean;
  itemCount: number;
  hasItems: boolean;
  layoutLabel: string;
  layoutCount: number;
}

export function SectionsManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [orderDirty, setOrderDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  async function patch(key: string, body: Partial<Pick<Row, "enabled" | "showInNav">>) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...body } : x)));
    setPending(key);
    try {
      await api(`/api/admin/sections/${key}`, { method: "PATCH", json: body });
      const row = rows.find((r) => r.key === key);
      if (body.enabled !== undefined) toast.success(`${row?.title} is now ${body.enabled ? "visible" : "hidden"} on your site`);
      else toast.success("Menu updated");
    } catch (e) {
      setRows(prev); // roll back optimistic update
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(null);
    }
  }

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    setOrderDirty(true);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      await api("/api/admin/sections/reorder", { method: "POST", json: { keys: rows.map((r) => r.key) } });
      setOrderDirty(false);
      toast.success("New order saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {orderDirty && (
        <div role="status" className="sticky top-16 z-20 mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-bg-2/95 px-4 py-3 text-sm backdrop-blur lg:top-4">
          <span>You changed the section order.</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => location.reload()}>
              Discard
            </Button>
            <Button onClick={saveOrder} loading={saving}>
              Save order
            </Button>
          </div>
        </div>
      )}
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.key} className={cn("rounded-2xl border border-line bg-white/[0.025] p-4 transition md:p-5", !r.enabled && "opacity-60")}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${r.title} up`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.title} down`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <span className="ml-1 w-6 text-center font-mono text-xs text-faint">{i + 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-semibold text-ink">{r.title}</span>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-muted">{r.typeLabel}</span>
                  {r.layoutLabel && (
                    <span className="rounded-md border border-accent-2/30 bg-accent-2/10 px-2 py-0.5 text-[11px] text-accent-2" title={`${r.layoutCount} designs available`}>
                      🎨 {r.layoutLabel}
                    </span>
                  )}
                  {r.hasItems && <span className="text-xs text-faint">{r.itemCount} entr{r.itemCount === 1 ? "y" : "ies"}</span>}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted">{r.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <Switch checked={r.enabled} onChange={(v) => patch(r.key, { enabled: v })} label={`Show ${r.title} section`} disabled={pending === r.key} />
                  {r.enabled ? "On" : "Off"}
                </label>
                {r.type !== "hero" && (
                  <label className="flex items-center gap-2 text-sm text-muted" title="Show in the top menu">
                    <Switch checked={r.showInNav} onChange={(v) => patch(r.key, { showInNav: v })} label={`Show ${r.title} in menu`} disabled={pending === r.key || !r.enabled} />
                    <MenuIcon className="size-4" aria-hidden /> Menu
                  </label>
                )}
                <Link href={`/admin/sections/${r.key}`} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm text-ink hover:border-accent">
                  <Pencil className="size-4" aria-hidden /> Edit
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
