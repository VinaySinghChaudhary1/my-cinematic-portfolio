"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, ArrowUp, ArrowDown, Search, ExternalLink } from "lucide-react";
import { getSectionType, type FieldDef } from "@/lib/registry";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, NoResults } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { api, ApiError } from "./api";
import { DynamicForm } from "./DynamicForm";
import { Button, Card, Switch, inputCls } from "./ui";
import { SectionFormContext } from "./LayoutPicker";

type Data = Record<string, unknown>;
interface Item {
  id: string;
  data: Data;
  visible: boolean;
  featured: boolean;
  status: string;
  publishAt: number | null;
}
type Pub = { status: string; publishAt: number | null };

/** "2026-10-05T18:30" in the browser's local time, for <input type="datetime-local">. */
function toLocalInput(t: number | null) {
  if (!t) return "";
  const d = new Date(t - new Date(t).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}
function pubState(p: Pub): "published" | "draft" | "scheduled" {
  if (p.status === "draft") return "draft";
  if (p.publishAt && p.publishAt > Date.now()) return "scheduled";
  return "published";
}

function PublishBadge({ item }: { item: Pub & { visible: boolean } }) {
  const st = pubState(item);
  if (st === "published") return null;
  return (
    <span
      className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", st === "draft" ? "bg-white/10 text-muted" : "bg-sky-500/15 text-sky-300")}
      title={st === "scheduled" ? `Goes live ${new Date(item.publishAt!).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "Only you (and testers who can see drafts) see this"}
    >
      {st === "draft" ? "Draft" : `Scheduled · ${new Date(item.publishAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
    </span>
  );
}

function PublishControl({ value, onChange }: { value: Pub; onChange: (v: Pub) => void }) {
  const st = value.status === "draft" ? "draft" : value.publishAt ? "scheduled" : "published";
  const past = st === "scheduled" && value.publishAt! <= Date.now();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
      <label htmlFor="item-publish">Publishing</label>
      <select
        id="item-publish"
        value={st}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "draft") onChange({ status: "draft", publishAt: value.publishAt });
          else if (v === "published") onChange({ status: "published", publishAt: null });
          else onChange({ status: "published", publishAt: value.publishAt && value.publishAt > Date.now() ? value.publishAt : Date.now() + 86_400_000 });
        }}
        className={cn(inputCls, "h-9 w-auto py-1")}
      >
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="scheduled">Scheduled</option>
      </select>
      {st === "scheduled" && (
        <input
          type="datetime-local"
          aria-label="Publish date and time"
          value={toLocalInput(value.publishAt)}
          onChange={(e) => onChange({ status: "published", publishAt: e.target.value ? new Date(e.target.value).getTime() : null })}
          className={cn(inputCls, "h-9 w-auto py-1")}
        />
      )}
      {past && <span className="text-xs text-warn">This time has passed — it&apos;s live now.</span>}
    </div>
  );
}

function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}

function blankItem(fields: FieldDef[]): Data {
  const d: Data = {};
  for (const f of fields) {
    if (f.type === "tags" || f.type === "images") d[f.name] = [];
    else if (f.type === "boolean") d[f.name] = false;
    else if (f.type === "select" && f.required) d[f.name] = f.options?.[0]?.value ?? "";
    else d[f.name] = "";
  }
  return d;
}

function SectionSettings({ section, fields }: { section: { key: string; type: string; title: string; subtitle: string; enabled: boolean; config: Data }; fields: FieldDef[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle);
  const [enabled, setEnabled] = useState(section.enabled);
  const [config, setConfig] = useState<Data>(section.config);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const initial = useMemo(() => JSON.stringify({ t: section.title, s: section.subtitle, e: section.enabled, c: section.config }), [section]);
  const dirty = JSON.stringify({ t: title, s: subtitle, e: enabled, c: config }) !== initial;
  useUnsavedGuard(dirty);

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      await api(`/api/admin/sections/${section.key}`, { method: "PATCH", json: { title, subtitle, enabled, config } });
      toast.success("Section saved — changes are live");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.fields)) f[k.replace(/^config\./, "")] = v;
        setErrors(f);
      }
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Section settings</h2>
        <label className="flex items-center gap-2 text-sm text-muted">
          <Switch checked={enabled} onChange={setEnabled} label="Section visible on site" />
          {enabled ? "Visible on site" : "Hidden from site"}
        </label>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="sec-title" className="mb-1.5 block text-sm font-medium text-ink/90">
            Menu label / section name <span className="text-danger">*</span>
          </label>
          <input id="sec-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={inputCls} aria-invalid={!!errors.title} />
          {errors.title && <p className="mt-1 text-xs text-danger">⚠ {errors.title}</p>}
        </div>
        <div>
          <label htmlFor="sec-sub" className="mb-1.5 block text-sm font-medium text-ink/90">
            Big heading
          </label>
          <input id="sec-sub" value={subtitle} maxLength={200} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} />
        </div>
      </div>
      {fields.length > 0 && (
        <div className="mt-5">
          <DynamicForm idPrefix="cfg" fields={fields} values={config} onChange={setConfig} errors={errors} ai={{ target: "config", sectionType: section.type, sectionTitle: section.title }} />
        </div>
      )}
      <div className="mt-6 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-warn">Unsaved changes</span>}
        <Button onClick={save} loading={saving} disabled={!dirty}>
          Save section
        </Button>
      </div>
    </Card>
  );
}

function ItemsManager({ sectionKey, sectionType, fields, label, initial, isProjects }: { sectionKey: string; sectionType: string; fields: FieldDef[]; label: string; initial: Item[]; isProjects: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<{ id: string | null; data: Data; visible: boolean; featured: boolean; status: string; publishAt: number | null } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => setItems(initial), [initial]);

  const primary = fields.find((f) => f.primary) ?? fields[0];
  const secondary = fields.find((f) => f.secondary);
  const thumbField = fields.find((f) => f.type === "image");

  const filtered = q ? items.filter((i) => JSON.stringify(i.data).toLowerCase().includes(q.toLowerCase())) : items;

  async function save() {
    if (!editing) return;
    setSaving(true);
    setErrors({});
    try {
      if (editing.id) {
        await api(`/api/admin/items/${editing.id}`, { method: "PATCH", json: { data: editing.data, visible: editing.visible, featured: editing.featured, status: editing.status, publishAt: editing.publishAt } });
        toast.success(`${label} updated`);
      } else {
        await api(`/api/admin/sections/${sectionKey}/items`, { method: "POST", json: { data: editing.data, visible: editing.visible, featured: editing.featured, status: editing.status, publishAt: editing.publishAt } });
        toast.success(`${label} added`);
      }
      setEditing(null);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.fields)) f[k.replace(/^data\./, "")] = v;
        setErrors(f);
      }
      toast.error(e instanceof Error ? e.message : "Could not save");
      // the form stays open with everything the user typed
    } finally {
      setSaving(false);
    }
  }

  async function quick(item: Item, body: Partial<Pick<Item, "visible" | "featured">>) {
    const prev = items;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...body } : i)));
    try {
      await api(`/api/admin/items/${item.id}`, { method: "PATCH", json: body });
    } catch (e) {
      setItems(prev);
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  async function remove(item: Item) {
    try {
      await api(`/api/admin/items/${item.id}`, { method: "DELETE" });
      setItems((list) => list.filter((i) => i.id !== item.id));
      toast.success(`${label} deleted`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setConfirmDelete(null);
    }
  }

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    setOrderDirty(true);
  }

  async function saveOrder() {
    try {
      await api(`/api/admin/sections/${sectionKey}/items/reorder`, { method: "POST", json: { ids: items.map((i) => i.id) } });
      setOrderDirty(false);
      toast.success("Order saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save order");
    }
  }

  const editingDirty = !!editing && editing.id !== null && JSON.stringify(editing.data) !== JSON.stringify(items.find((i) => i.id === editing.id)?.data);

  return (
    <Card className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Entries <span className="text-sm font-normal text-faint">({items.length})</span>
          </h2>
          <p className="text-sm text-muted">Hide an entry with the eye icon — it stays saved but won&apos;t appear publicly.</p>
        </div>
        <div className="flex gap-2">
          {orderDirty && (
            <Button variant="outline" onClick={saveOrder}>
              Save order
            </Button>
          )}
          <Button
            onClick={() => {
              setErrors({});
              setEditing({ id: null, data: blankItem(fields), visible: true, featured: false, status: "published", publishAt: null });
            }}
          >
            <Plus className="size-4" aria-hidden /> Add {label.toLowerCase()}
          </Button>
        </div>
      </div>

      {items.length > 5 && (
        <label className="relative mt-4 block">
          <span className="sr-only">Search entries</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entries…" className={cn(inputCls, "pl-9")} />
        </label>
      )}

      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState
            title={`No ${label.toLowerCase()} entries yet`}
            text="This section is hidden on your site until you add at least one visible entry."
            action={
              <Button onClick={() => setEditing({ id: null, data: blankItem(fields), visible: true, featured: false, status: "published", publishAt: null })}>
                <Plus className="size-4" aria-hidden /> Add the first one
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={q} onReset={() => setQ("")} />
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {filtered.map((it) => {
              const idx = items.indexOf(it);
              const thumb = thumbField ? String(it.data[thumbField.name] ?? "") : "";
              return (
                <li key={it.id} className={cn("flex items-center gap-3 p-3", !it.visible && "opacity-50")}>
                  {!q && (
                    <div className="flex flex-col">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up" className="rounded p-1 text-faint hover:text-ink disabled:opacity-30">
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} aria-label="Move down" className="rounded p-1 text-faint hover:text-ink disabled:opacity-30">
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                  )}
                  {thumbField && (
                    <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-white/5">{thumb && <img src={thumb} alt="" className="size-full object-cover" />}</span>
                  )}
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEditing({ id: it.id, data: { ...it.data }, visible: it.visible, featured: it.featured, status: it.status, publishAt: it.publishAt })}>
                    <span className="block truncate text-sm font-medium text-ink">{String(it.data[primary.name] || "(untitled)")}</span>
                    {secondary && <span className="block truncate text-xs text-muted">{String(it.data[secondary.name] ?? "")}</span>}
                  </button>
                  <PublishBadge item={it} />
                  <div className="flex items-center gap-1">
                    {isProjects && (
                      <button onClick={() => quick(it, { featured: !it.featured })} aria-pressed={it.featured} aria-label={it.featured ? "Unfeature" : "Feature"} title="Featured" className={cn("grid size-9 place-items-center rounded-lg hover:bg-white/5", it.featured ? "text-warn" : "text-faint")}>
                        <Star className={cn("size-4", it.featured && "fill-current")} />
                      </button>
                    )}
                    <button onClick={() => quick(it, { visible: !it.visible })} aria-label={it.visible ? "Hide from site" : "Show on site"} title={it.visible ? "Visible" : "Hidden"} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink">
                      {it.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button onClick={() => setEditing({ id: it.id, data: { ...it.data }, visible: it.visible, featured: it.featured, status: it.status, publishAt: it.publishAt })} aria-label="Edit" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(it)} aria-label="Delete" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => {
          if (editingDirty && !confirm("Discard unsaved changes?")) return;
          setEditing(null);
        }}
        title={editing?.id ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}
        wide
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="p-5"
          >
            <DynamicForm
              idPrefix="item"
              fields={fields}
              values={editing.data}
              onChange={(data) => setEditing({ ...editing, data })}
              errors={errors}
              ai={{ target: "item", sectionType, examples: items.filter((x) => x.id !== editing.id).slice(0, 2).map((x) => x.data) }}
            />
            <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <Switch checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} label="Visible on site" /> Visible
                </label>
                <PublishControl value={{ status: editing.status, publishAt: editing.publishAt }} onChange={(p) => setEditing({ ...editing, ...p })} />
                {isProjects && (
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <Switch checked={editing.featured} onChange={(v) => setEditing({ ...editing, featured: v })} label="Featured" /> Featured
                  </label>
                )}
                {isProjects && editing.id && (
                  <a href={`/projects/${String(editing.data.slug ?? "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-accent-2 hover:underline">
                    Preview page <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editing.id ? "Save changes" : `Add ${label.toLowerCase()}`}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete entry?">
        <div className="p-5">
          <p className="text-sm text-muted">
            “{confirmDelete ? String(confirmDelete.data[primary.name] || "this entry") : ""}” will be permanently deleted. Tip: you can hide it instead (eye icon) to keep it for later.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => confirmDelete && remove(confirmDelete)}>
              <Trash2 className="size-4" aria-hidden /> Delete permanently
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function SectionEditor({
  section,
  typeLabel,
  description,
  items,
}: {
  section: { key: string; type: string; title: string; subtitle: string; enabled: boolean; config: Data };
  typeLabel: string;
  description: string;
  items: Item[];
}) {
  const def = getSectionType(section.type)!;
  return (
    <>
      <div className="mb-8">
        <p className="eyebrow">{typeLabel}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{section.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        <a href={`/#${section.key}`} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-sm text-accent-2 hover:underline">
          View on site <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
      <SectionFormContext.Provider value={{ sectionKey: section.key, sectionType: section.type }}>
        <SectionSettings section={section} fields={def.configFields} />
      </SectionFormContext.Provider>
      {def.itemFields && <ItemsManager sectionKey={section.key} sectionType={section.type} fields={def.itemFields} label={def.itemLabel ?? "Entry"} initial={items} isProjects={section.type === "projects"} />}
    </>
  );
}
