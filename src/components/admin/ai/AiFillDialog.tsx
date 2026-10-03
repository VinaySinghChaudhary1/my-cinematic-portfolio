"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Paperclip, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { FieldDef } from "@/lib/registry";
import { cn } from "@/lib/utils";
import { api, compressImage } from "../api";
import { Button, inputCls } from "../ui";
import { ProviderPicker } from "./ProviderPicker";
import { fallbackNote, useAiStatus, usePick, type AiStatus, type AiTarget, type Failed } from "./useAiStatus";

const SKIP = new Set(["image", "images", "file", "layout", "color"]);
const MAX_FILE = 3 * 1024 * 1024;

function show(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v ?? "");
}

async function toBase64(f: File): Promise<string> {
  const buf = new Uint8Array(await f.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

/** "✨ Fill with AI" — notes / files in, a reviewed set of field values out. Nothing is saved until you press Save. */
export function AiFillButton({ ai, fields, values, onApply, className }: { ai: AiTarget; fields: FieldDef[]; values: Record<string, unknown>; onApply: (v: Record<string, unknown>) => void; className?: string }) {
  const status = useAiStatus();
  const [open, setOpen] = useState(false);
  const usable = fields.filter((f) => !SKIP.has(f.type));
  if (!usable.length || status === null) return null;
  if (!status.ready)
    return (
      <Link href="/admin/ai" className={cn("inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted hover:text-ink", className)}>
        <Sparkles className="size-3.5 text-accent-2" aria-hidden /> Set up AI to fill this form
      </Link>
    );
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className={className}>
        <Sparkles className="size-4 text-accent-2" aria-hidden /> Fill with AI
      </Button>
      {open && <FillDialog ai={ai} fields={fields} values={values} onApply={onApply} onClose={() => setOpen(false)} status={status} />}
    </>
  );
}

function FillDialog({ ai, fields, values, onApply, onClose, status }: { ai: AiTarget; fields: FieldDef[]; values: Record<string, unknown>; onApply: (v: Record<string, unknown>) => void; onClose: () => void; status: AiStatus }) {
  const [providerPick, setPickProvider] = usePick("text", status);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const existing = useMemo(
    () =>
      fields
        .filter((f) => f.type === "file" || f.type === "image")
        .map((f) => ({ label: f.label, url: String(values[f.name] ?? "") }))
        .filter((x) => x.url.startsWith("/media/") || x.url.startsWith("/me/") || x.url.startsWith("https://")),
    [fields, values],
  );
  const [useExisting, setUseExisting] = useState<Set<string>>(new Set(existing.filter((e) => /\.pdf$/i.test(e.url)).map((e) => e.url)));
  const [busy, setBusy] = useState(false);
  const hasPdf = files.some((f) => f.type === "application/pdf") || [...useExisting].some((u) => /\.pdf$/i.test(u));
  const [result, setResult] = useState<{ values: Record<string, unknown>; rejected: { field: string; reason: string }[]; provider: string; model: string; failed: Failed[] } | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const labels = Object.fromEntries(fields.map((f) => [f.name, f.label]));

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const raw of Array.from(list)) {
      const f = raw.type.startsWith("image/") ? await compressImage(raw, 2000, 0.85) : raw;
      if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(f.type)) {
        toast.error(`${raw.name}: attach a PDF, JPG, PNG or WEBP`);
        continue;
      }
      if (f.size > MAX_FILE) {
        toast.error(`${raw.name} is larger than 3 MB — paste its text instead, or upload it to the media library and pick it in the form first.`);
        continue;
      }
      next.push(f);
    }
    setFiles(next.slice(0, 2));
  }

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const attachments = [
        ...[...useExisting].map((url) => ({ url })),
        ...(await Promise.all(files.map(async (f) => ({ name: f.name, base64: await toBase64(f) })))),
      ];
      const current = Object.fromEntries(fields.filter((f) => !SKIP.has(f.type)).map((f) => [f.name, values[f.name]]));
      const r = await api<{ values: Record<string, unknown>; rejected: { field: string; reason: string }[]; provider: string; model: string; failed: Failed[] }>("/api/admin/ai/fill", {
        method: "POST",
        json: { ...ai, notes, current, attachments, provider: providerPick },
      });
      const note = fallbackNote(r.failed, r.provider);
      if (note) toast.info(note, { duration: 12000 });
      const changed = Object.keys(r.values).filter((k) => JSON.stringify(r.values[k]) !== JSON.stringify(values[k]));
      setResult(r);
      setPick(new Set(changed));
      if (!changed.length) toast.info("The AI found nothing new to fill — add more detail to your notes.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed", { duration: 15000 });
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!result) return;
    const patch = Object.fromEntries(Object.entries(result.values).filter(([k]) => pick.has(k)));
    onApply({ ...values, ...patch });
    toast.success(`${Object.keys(patch).length} field(s) filled — review them, then save.`);
    onClose();
  }

  const changedKeys = result ? Object.keys(result.values).filter((k) => JSON.stringify(result.values[k]) !== JSON.stringify(values[k])) : [];

  return (
    <Modal open onClose={() => !busy && onClose()} title="Fill with AI" wide>
      <div className="space-y-5 p-6">
        {!result ? (
          <>
            <div>
              <label htmlFor="ai-notes" className="mb-1.5 block text-sm font-medium text-ink/90">
                What do you have? Rough notes are fine.
              </label>
              <textarea
                id="ai-notes"
                rows={7}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={20000}
                className={inputCls}
                placeholder={"e.g. Diploma in Data Science, IIT Madras, finished Sep 2026, CGPA 8.5, courses MLT, MLP, BDM…\nor paste a résumé line, a LinkedIn entry, a GitHub README section"}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink/90">Files for the AI to read (optional)</p>
              {existing.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {existing.map((e) => {
                    const on = useExisting.has(e.url);
                    return (
                      <li key={e.url}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setUseExisting((s) => {
                            const n = new Set(s);
                            if (n.has(e.url)) n.delete(e.url);
                            else n.add(e.url);
                            return n;
                          })}
                          className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs", on ? "border-accent-2/60 bg-accent-2/10 text-ink" : "border-line text-muted")}
                        >
                          <FileText className="size-3.5" aria-hidden /> {e.label}: {e.url.split("/").pop()}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <ul className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <li key={f.name + i} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink">
                    <Paperclip className="size-3.5" aria-hidden /> {f.name}
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-muted hover:text-danger">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
                {files.length < 2 && (
                  <li>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-muted hover:text-ink">
                      <Paperclip className="size-3.5" aria-hidden /> Attach PDF or image
                      <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
                    </label>
                  </li>
                )}
              </ul>
              <p className="text-xs text-faint">Certificates, résumé pages, screenshots. Max 3 MB each, 2 files.</p>
            </div>
            <ProviderPicker status={status} kind="text" value={providerPick} onChange={setPickProvider} needsPdf={hasPdf} className="max-w-md" />
            <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-faint">Only facts from your notes and files are used — nothing is saved until you press Save.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                <Button type="button" onClick={run} loading={busy} disabled={!notes.trim() && !files.length && !useExisting.size}>
                  <Sparkles className="size-4" aria-hidden /> {busy ? "Thinking…" : "Fill the form"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Tick the suggestions you want. You can still edit everything before saving.</p>
            <p className="text-xs text-faint">
              Filled by <span className="text-ink">{result.provider}</span> · <span className="font-mono">{result.model}</span>
              {result.failed.length > 0 && <> (after {result.failed.map((f) => f.provider).join(", ")} failed)</>}
            </p>
            {changedKeys.length === 0 ? (
              <p className="rounded-xl border border-line p-4 text-sm text-muted">No new values — try adding more detail.</p>
            ) : (
              <ul className="max-h-[50dvh] divide-y divide-line overflow-auto rounded-xl border border-line">
                {changedKeys.map((k) => (
                  <li key={k} className="flex gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      aria-label={`Use ${labels[k]}`}
                      checked={pick.has(k)}
                      onChange={() => setPick((s) => {
                        const n = new Set(s);
                        if (n.has(k)) n.delete(k);
                        else n.add(k);
                        return n;
                      })}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wider text-faint">{labels[k] ?? k}</p>
                      {show(values[k]) && <p className="mt-0.5 truncate text-xs text-faint line-through">{show(values[k])}</p>}
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{show(result.values[k]).slice(0, 600)}{show(result.values[k]).length > 600 ? "…" : ""}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {result.rejected.length > 0 && (
              <p className="text-xs text-warn">Skipped (didn&apos;t pass the form&apos;s rules): {result.rejected.map((r) => `${r.field} — ${r.reason}`).join("; ")}</p>
            )}
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => setResult(null)}>
                Back
              </Button>
              <Button type="button" onClick={apply} disabled={pick.size === 0}>
                Apply {pick.size} to form
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
