"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy as CopyIcon, FileText, Briefcase, Paperclip, Pencil, Sparkles, Upload, X } from "lucide-react";
import { unzip, strFromU8 } from "fflate";
import { getSectionType } from "@/lib/registry";
import { LINKEDIN_FILES } from "@/lib/import/linkedin";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { api, ApiError, compressImage } from "./api";
import { Button, Card, Switch, inputCls } from "./ui";
import { DynamicForm } from "./DynamicForm";
import { ProviderPicker } from "./ai/ProviderPicker";
import { fallbackNote, useAiStatus, usePick, type Failed } from "./ai/useAiStatus";

interface Entry {
  id: string;
  type: string;
  typeLabel: string;
  sectionKey: string | null;
  sectionTitle: string;
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
  source: string;
  duplicate: string | null;
  problems: string[];
}

const MAX_FILE = 3 * 1024 * 1024;

async function toBase64(f: File): Promise<string> {
  const buf = new Uint8Array(await f.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Reads only the CSV files the importer understands out of LinkedIn's ZIP (it can be large), in the browser. */
function readLinkedInZip(file: File): Promise<Record<string, string>> {
  const wanted = new Set(LINKEDIN_FILES.map((f) => f.toLowerCase()));
  return file.arrayBuffer().then(
    (buf) =>
      new Promise((resolve, reject) =>
        unzip(new Uint8Array(buf), { filter: (f) => wanted.has(f.name.split("/").pop()!.toLowerCase()) && f.originalSize < 1_500_000 }, (err, files) => {
          if (err) return reject(new Error("That ZIP couldn't be opened. Use the file LinkedIn emailed you, unchanged."));
          resolve(Object.fromEntries(Object.entries(files).map(([k, v]) => [k.split("/").pop()!, strFromU8(v)])));
        }),
      ),
  );
}

const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? ""));

export function ImportManager() {
  const status = useAiStatus();
  const [provider, setProvider] = usePick("text", status);
  const [tab, setTab] = useState<"ai" | "linkedin">("ai");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [publish, setPublish] = useState(false);
  const [applying, setApplying] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [done, setDone] = useState<{ added: number; counts: Record<string, number> } | null>(null);

  function load(list: Entry[]) {
    setEntries(list);
    setPicked(new Set(list.filter((e) => !e.duplicate && !e.problems.length).map((e) => e.id)));
    setDone(null);
    if (!list.length) toast.info("Nothing to import was found.");
  }

  async function readAi() {
    setBusy(true);
    try {
      const attachment = file ? { name: file.name, base64: await toBase64(file) } : undefined;
      const r = await api<{ entries: Entry[]; provider: string; failed: Failed[] }>("/api/admin/import/parse", { method: "POST", json: { mode: "ai", notes, attachment, provider } });
      const note = fallbackNote(r.failed, r.provider);
      if (note) toast.info(note, { duration: 12000 });
      load(r.entries);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read the résumé", { duration: 15000 });
    } finally {
      setBusy(false);
    }
  }

  async function readLinkedIn(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      let files: Record<string, string> = {};
      for (const f of Array.from(list)) {
        if (/\.zip$/i.test(f.name)) files = { ...files, ...(await readLinkedInZip(f)) };
        else if (/\.csv$/i.test(f.name) && f.size < 1_500_000) files[f.name] = await f.text();
      }
      if (!Object.keys(files).length) throw new Error(`No LinkedIn files found. The ZIP should contain ${LINKEDIN_FILES.slice(0, 3).join(", ")}…`);
      const r = await api<{ entries: Entry[]; used: string[] }>("/api/admin/import/parse", { method: "POST", json: { mode: "linkedin", files } });
      toast.success(`Read ${r.used.join(", ")}`);
      load(r.entries);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read the LinkedIn export", { duration: 12000 });
    } finally {
      setBusy(false);
    }
  }

  async function pickResume(f: File | undefined) {
    if (!f) return;
    const x = f.type.startsWith("image/") ? await compressImage(f, 2000, 0.85) : f;
    if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(x.type)) return void toast.error("Attach a PDF, JPG, PNG or WEBP file");
    if (x.size > MAX_FILE) return void toast.error("That file is larger than 3 MB — paste the résumé text instead.");
    setFile(x);
  }

  async function apply() {
    if (!entries) return;
    const chosen = entries.filter((e) => picked.has(e.id) && e.sectionKey);
    setApplying(true);
    try {
      const r = await api<{ added: number; counts: Record<string, number> }>("/api/admin/import/apply", {
        method: "POST",
        json: { entries: chosen.map((e) => ({ id: e.id, sectionKey: e.sectionKey, data: e.data })), status: publish ? "published" : "draft" },
      });
      setDone(r);
      setEntries(null);
      toast.success(`${r.added} entr${r.added === 1 ? "y" : "ies"} added`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.fields) {
        const bad = e.fields;
        setEntries((list) => list?.map((x) => (bad[x.id] ? { ...x, problems: bad[x.id].split(" | ") } : x)) ?? null);
      }
      toast.error(e instanceof Error ? e.message : "Import failed", { duration: 12000 });
    } finally {
      setApplying(false);
    }
  }

  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries ?? []) m.set(e.typeLabel, [...(m.get(e.typeLabel) ?? []), e]);
    return [...m.entries()];
  }, [entries]);

  const toggle = (id: string, on: boolean) =>
    setPicked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <div className="space-y-6">
      {done && (
        <Card className="border-emerald-500/30">
          <p className="flex items-center gap-2 font-medium text-ink">
            <CheckCircle2 className="size-5 text-emerald-400" aria-hidden /> {done.added} entr{done.added === 1 ? "y" : "ies"} added{publish ? "" : " as drafts"}.
          </p>
          <p className="mt-1 text-sm text-muted">
            {publish ? "They're live now." : "Visitors don't see drafts yet — open each section, check the entries and switch them to Published."} A backup named “Before bulk import” was taken, so you can undo everything in{" "}
            <Link href="/admin/backups" className="text-accent-2 hover:underline">Backups</Link>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(done.counts).map(([key, n]) => (
              <Link key={key} href={`/admin/sections/${key}`} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink hover:border-accent/60">
                {key} · {n}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {!entries && (
        <Card>
          <div role="tablist" aria-label="Import from" className="mb-5 inline-flex rounded-xl border border-line p-1">
            {(
              [
                ["ai", "Résumé (AI)", FileText],
                ["linkedin", "LinkedIn export", Briefcase],
              ] as const
            ).map(([k, label, Icon]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm", tab === k ? "bg-white/[0.08] text-ink" : "text-muted hover:text-ink")}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>

          {tab === "ai" ? (
            status && !status.ready ? (
              <p className="text-sm text-muted">
                Reading a résumé needs AI. <Link href="/admin/ai" className="text-accent-2 hover:underline">Set up a provider</Link> (Gemini and OpenRouter have free options), or use the LinkedIn tab.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted">Attach your résumé (PDF or a photo) and/or paste its text — or your LinkedIn “About”, “Experience” and “Skills”. The AI only uses facts that are written there.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-4 py-2 text-sm text-ink hover:border-accent/60">
                    <Paperclip className="size-4" aria-hidden /> {file ? "Change file" : "Attach résumé"}
                    <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickResume(e.target.files?.[0])} />
                  </label>
                  {file && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-ink">
                      {file.name}
                      <button onClick={() => setFile(null)} aria-label="Remove file" className="text-muted hover:text-ink"><X className="size-3.5" /></button>
                    </span>
                  )}
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} className={inputCls} placeholder="Paste résumé text here (optional if you attached a file)" aria-label="Résumé text" />
                <div className="flex flex-wrap items-end gap-4">
                  {status && <ProviderPicker status={status} kind="text" value={provider} onChange={setProvider} needsPdf={file?.type === "application/pdf"} className="min-w-64" />}
                  <Button onClick={readAi} loading={busy} disabled={!file && !notes.trim()}>
                    <Sparkles className="size-4" aria-hidden /> {busy ? "Reading… (up to a minute)" : "Read résumé"}
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4 text-sm text-muted">
              <ol className="list-decimal space-y-1 pl-5">
                <li>On LinkedIn: <b className="text-ink">Me → Settings & Privacy → Data privacy → Get a copy of your data</b>.</li>
                <li>Choose “Download larger data archive” (or pick Positions, Education, Skills, Certifications, Projects, Honors) and request it.</li>
                <li>LinkedIn emails you a ZIP within ~10 minutes to a day. Upload it here as it is.</li>
              </ol>
              <p className="text-xs">Only {LINKEDIN_FILES.join(", ")} are read — in your browser. Messages, connections and everything else in the ZIP never leave your computer.</p>
              <label className={cn("inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white", busy && "pointer-events-none opacity-60")}>
                <Upload className="size-4" aria-hidden /> {busy ? "Reading…" : "Upload LinkedIn ZIP or CSV files"}
                <input type="file" accept=".zip,.csv,application/zip,text/csv" multiple className="sr-only" onChange={(e) => readLinkedIn(e.target.files)} />
              </label>
            </div>
          )}
        </Card>
      )}

      {entries && (
        <>
          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">Review {entries.length} found entr{entries.length === 1 ? "y" : "ies"}</h2>
                <p className="mt-1 text-sm text-muted">Tick what to add. Possible duplicates and entries that need fixing start unticked — use the pencil to fix them.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <Switch checked={publish} onChange={setPublish} label="Publish immediately" /> Publish immediately
                </label>
                <Button variant="ghost" onClick={() => setEntries(null)}>Start over</Button>
                <Button onClick={apply} loading={applying} disabled={!picked.size}>
                  Add {picked.size} {publish ? "" : "as drafts"}
                </Button>
              </div>
            </div>
          </Card>

          {groups.map(([label, list]) => (
            <Card key={label}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display font-semibold text-ink">
                  {label} <span className="text-sm font-normal text-faint">→ {list[0].sectionKey ? `“${list[0].sectionTitle}” section` : "no section on your site"}</span>
                </h3>
                {list.some((e) => e.sectionKey) && (
                  <button
                    className="text-xs text-accent-2 hover:underline"
                    onClick={() => {
                      const all = list.every((e) => picked.has(e.id));
                      list.forEach((e) => e.sectionKey && toggle(e.id, !all));
                    }}
                  >
                    {list.every((e) => picked.has(e.id)) ? "Untick all" : "Tick all"}
                  </button>
                )}
              </div>
              <ul className="divide-y divide-line">
                {list.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 py-3">
                    <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={picked.has(e.id)} disabled={!e.sectionKey} onChange={(ev) => toggle(e.id, ev.target.checked)} aria-label={`Add ${e.title}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{e.title}</p>
                      {e.subtitle && <p className="truncate text-xs text-muted">{e.subtitle}</p>}
                      <p className="mt-1 line-clamp-2 text-xs text-faint">
                        {Object.entries(e.data)
                          .filter(([k, v]) => show(v) && show(v) !== e.title && show(v) !== e.subtitle && k !== "slug")
                          .slice(0, 5)
                          .map(([, v]) => show(v))
                          .join(" · ")}
                      </p>
                      {e.duplicate && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                          <CopyIcon className="size-3" aria-hidden /> {e.duplicate}
                        </p>
                      )}
                      {e.problems.map((p) => (
                        <p key={p} className="mt-1 flex items-center gap-1 text-xs text-danger">
                          <AlertTriangle className="size-3" aria-hidden /> {p}
                        </p>
                      ))}
                    </div>
                    <span className="hidden shrink-0 text-[10px] text-faint sm:block">{e.source}</span>
                    {e.sectionKey && (
                      <button onClick={() => setEditing(e)} aria-label={`Edit ${e.title}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink">
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.typeLabel.toLowerCase()} entry` : "Edit"} wide>
        {editing && <EditEntry entry={editing} onCancel={() => setEditing(null)} onSave={(data) => {
          const def = getSectionType(editing.type)!;
          const primary = (def.itemFields!.find((f) => f.primary) ?? def.itemFields![0]).name;
          const secondary = def.itemFields!.find((f) => f.secondary)?.name;
          const next = { ...editing, data, title: String(data[primary] ?? "") || "(untitled)", subtitle: secondary ? String(data[secondary] ?? "") : "", problems: [] };
          setEntries((list) => list?.map((x) => (x.id === editing.id ? next : x)) ?? null);
          toggle(editing.id, true);
          setEditing(null);
        }} />}
      </Modal>
    </div>
  );
}

function EditEntry({ entry, onSave, onCancel }: { entry: Entry; onSave: (d: Record<string, unknown>) => void; onCancel: () => void }) {
  const fields = getSectionType(entry.type)?.itemFields ?? [];
  const [data, setData] = useState(entry.data);
  return (
    <form
      className="p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(data);
      }}
    >
      <DynamicForm idPrefix="import" fields={fields} values={data} onChange={setData} />
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Use these values</Button>
      </div>
    </form>
  );
}
