"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Info, KeyRound, ListRestart, Lock, PlugZap, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Spinner, ErrorState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { api } from "../api";
import { Button, Card, inputCls } from "../ui";
import { loadAiStatus } from "./useAiStatus";

type Kind = "anthropic" | "gemini" | "openai" | "compatible";
const BUILT_IN: Kind[] = ["anthropic", "gemini", "openai"];

interface Slot {
  id: string;
  kind: Kind;
  label: string;
  configured: boolean;
  keyOk: boolean;
  last4: string;
  textModel: string;
  imageModel: string;
  baseUrl: string;
  canPdf: boolean;
  canImage: boolean;
  hasImageModel: boolean;
}
interface KInfo {
  name: string;
  keyUrl: string;
  text: string;
  image: string;
  canImage: boolean;
  canPdf: boolean;
}
interface Preset {
  id: string;
  label: string;
  baseUrl: string;
  keyUrl: string;
  textModel: string;
  imageModel: string;
  note: string;
}
interface Config {
  slots: Slot[];
  textOrder: string[];
  imageOrder: string[];
  fallback: boolean;
  styleNotes: string;
  info: Record<Kind, KInfo>;
  presets: Preset[];
}
interface UsageRow {
  id: string;
  provider: string;
  model: string;
  task: string;
  inputTokens: number;
  outputTokens: number;
  ok: boolean;
  error: string;
  createdAt: number;
}
interface Usage {
  byProvider: Record<string, { requests: number; failed: number; inputTokens: number; outputTokens: number }>;
  recent: UsageRow[];
}
interface Defaults {
  textOrder: string[];
  imageOrder: string[];
  fallback: boolean;
  styleNotes: string;
}

const emptySlot = (kind: Kind, info: KInfo): Slot => ({ id: kind, kind, label: info.name, configured: false, keyOk: true, last4: "", textModel: info.text, imageModel: info.image, baseUrl: "", canPdf: info.canPdf, canImage: info.canImage, hasImageModel: false });

export function AiSettings() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ config: Config; usage: Usage }>("/api/admin/ai");
      setCfg(r.config);
      setUsage(r.usage);
      setDefaults({ textOrder: r.config.textOrder, imageOrder: r.config.imageOrder, fallback: r.config.fallback, styleNotes: r.config.styleNotes });
      void loadAiStatus(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load AI settings");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (error && !cfg) return <ErrorState text={error} onRetry={load} />;
  if (!cfg || !defaults) return <Spinner label="Loading AI settings…" />;
  const configured = cfg.slots.filter((s) => s.configured);
  const compatibles = cfg.slots.filter((s) => s.kind === "compatible");
  const labelOf = (id: string) => (id === "svg" ? "Vector drawing (SVG)" : (cfg.slots.find((s) => s.id === id)?.label ?? cfg.info[id as Kind]?.name ?? id));

  async function saveDefaults() {
    setSaving(true);
    try {
      await api("/api/admin/ai", { method: "PUT", json: defaults });
      toast.success("AI order saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="flex gap-3 text-sm text-muted">
        <Info className="mt-0.5 size-5 shrink-0 text-accent-2" aria-hidden />
        <div className="space-y-1">
          <p>
            Use your own API keys. After setup, every form in the admin panel gets <strong className="text-ink">✨ Fill with AI</strong>, an <strong className="text-ink">AI</strong> button on long text fields, and <strong className="text-ink">Generate</strong> on image fields. Suggestions are drafts — nothing is saved until you press Save.
          </p>
          <p>
            Connect as many providers as you like. They are used in the <strong className="text-ink">order</strong> you set below; with <strong className="text-ink">fallback</strong> on, when one runs out of credit, is overloaded or can&apos;t read a file, the next one takes over automatically. Every AI dialog also lets you pick one provider for that request.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-faint">
            <Lock className="size-3.5" aria-hidden /> Keys are encrypted on the server, never shown again, and never included in backups. There is no spending cap in the app — your provider&apos;s own limits apply.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {BUILT_IN.map((k) => (
          <ProviderCard key={k} slot={cfg.slots.find((s) => s.id === k) ?? emptySlot(k, cfg.info[k])} info={cfg.info[k]} onChanged={load} roles={roles(k, defaults)} />
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-ink">OpenAI-compatible services</h2>
        <p className="mt-1 text-sm text-muted">OpenRouter, Groq, Together, DeepSeek, Mistral, Cerebras, Ollama, LM Studio — any service with an “OpenAI-compatible API”. Add as many as you like (for example several free tiers).</p>
        <div className="mt-4 grid gap-6 xl:grid-cols-2">
          {compatibles.map((s) => (
            <ProviderCard key={s.id} slot={s} info={cfg.info.compatible} onChanged={load} roles={roles(s.id, defaults)} />
          ))}
          <AddCompatible presets={cfg.presets} onAdded={load} count={compatibles.length} />
        </div>
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Order &amp; fallback</h2>
        {configured.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Save at least one API key above first.</p>
        ) : (
          <>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-line p-4">
              <input type="checkbox" className="mt-1" checked={defaults.fallback} onChange={(e) => setDefaults({ ...defaults, fallback: e.target.checked })} />
              <span>
                <span className="block text-sm font-medium text-ink">Automatic fallback</span>
                <span className="block text-xs text-muted">When a provider fails (limit exhausted, rate-limited, overloaded, wrong model, can&apos;t read PDFs), try the next one in the list. Off = only the first provider is used. Safety blocks never switch provider.</span>
              </span>
            </label>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <OrderList
                title="Writing, filling forms, reading files"
                hint="Logos and icons are drawn by these too."
                all={configured.map((s) => ({ id: s.id, label: s.label, detail: s.textModel || "no writing model", warn: !s.textModel, tag: s.canPdf ? "reads PDFs" : "no PDFs" }))}
                order={defaults.textOrder}
                onChange={(textOrder) => setDefaults({ ...defaults, textOrder })}
                fallback={defaults.fallback}
              />
              <OrderList
                title="Covers & artwork"
                hint="SVG = vector art drawn by the writing providers (free, never photo-like)."
                all={[
                  ...configured.filter((s) => s.canImage).map((s) => ({ id: s.id, label: s.label, detail: s.imageModel || "no image model — set one in its card", warn: !s.imageModel, tag: "" })),
                  { id: "svg", label: "Vector drawing (SVG)", detail: "made by the writing order", warn: false, tag: "" },
                ]}
                order={defaults.imageOrder}
                onChange={(imageOrder) => setDefaults({ ...defaults, imageOrder })}
                fallback={defaults.fallback}
              />
              <div className="md:col-span-2">
                <label htmlFor="ai-style" className="mb-1 block text-xs text-muted">
                  Extra style notes for images (optional)
                </label>
                <input id="ai-style" className={inputCls} maxLength={500} value={defaults.styleNotes} onChange={(e) => setDefaults({ ...defaults, styleNotes: e.target.value })} placeholder="e.g. isometric 3D, minimal, lots of negative space" />
              </div>
            </div>
          </>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-faint">Public “Ask about me” chat for visitors: planned — off by default.</p>
          <Button onClick={saveDefaults} loading={saving} disabled={configured.length === 0}>
            <Save className="size-4" aria-hidden /> Save order
          </Button>
        </div>
      </Card>

      {usage && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Usage · last 30 days</h2>
          <p className="mt-1 text-sm text-muted">Every request — including each fallback attempt — with the provider and model that handled it. Token counts as reported by each provider; check your provider&apos;s dashboard for billing.</p>
          {Object.keys(usage.byProvider).length === 0 ? (
            <p className="mt-4 text-sm text-faint">No AI requests yet.</p>
          ) : (
            <>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(usage.byProvider).map(([p, u]) => (
                  <li key={p} className="rounded-xl border border-line p-4">
                    <p className="text-xs uppercase tracking-wider text-faint">{labelOf(p)}</p>
                    <p className="mt-1 font-display text-2xl text-ink">{u.requests}</p>
                    <p className="text-xs text-muted">
                      requests{u.failed ? ` · ${u.failed} failed` : ""} · {(u.inputTokens / 1000).toFixed(1)}k in / {(u.outputTokens / 1000).toFixed(1)}k out
                    </p>
                  </li>
                ))}
              </ul>
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
                {usage.recent.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-40 shrink-0 text-xs text-faint">{new Date(r.createdAt).toLocaleString()}</span>
                    <span className="w-20 shrink-0 text-xs uppercase tracking-wider text-muted">{r.task}</span>
                    <span className="w-28 shrink-0 truncate text-xs text-muted">{labelOf(r.provider)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink" title={r.error || r.model}>
                      {r.ok ? <CheckCircle2 className="mr-1 inline size-3.5 text-success" aria-label="OK" /> : <AlertTriangle className="mr-1 inline size-3.5 text-warn" aria-label="Failed" />}
                      {r.ok ? r.model : r.error}
                    </span>
                    {r.ok && <span className="shrink-0 text-xs text-faint">{r.inputTokens + r.outputTokens} tokens</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function roles(id: string, d: Defaults): string {
  const r: string[] = [];
  const t = d.textOrder.indexOf(id);
  const i = d.imageOrder.indexOf(id);
  if (t >= 0) r.push(t === 0 ? "1st for writing" : `#${t + 1} for writing`);
  if (i >= 0) r.push(i === 0 ? "1st for images" : `#${i + 1} for images`);
  return r.join(" · ");
}

function OrderList({ title, hint, all, order, onChange, fallback }: { title: string; hint: string; all: { id: string; label: string; detail: string; warn: boolean; tag: string }[]; order: string[]; onChange: (o: string[]) => void; fallback: boolean }) {
  const on = order.filter((id) => all.some((a) => a.id === id));
  const off = all.filter((a) => !on.includes(a.id));
  const move = (id: string, d: -1 | 1) => {
    const i = on.indexOf(id);
    const j = i + d;
    if (j < 0 || j >= on.length) return;
    const n = [...on];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const row = (a: (typeof all)[number], idx: number | null) => (
    <li key={a.id} className={cn("flex items-center gap-3 px-3 py-2.5", idx === null && "opacity-60")}>
      <input type="checkbox" aria-label={`Use ${a.label}`} checked={idx !== null} onChange={(e) => onChange(e.target.checked ? [...on, a.id] : on.filter((x) => x !== a.id))} />
      <span className="w-5 shrink-0 text-center text-xs text-faint">{idx !== null ? idx + 1 : "–"}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">
          {a.label}
          {idx !== null && idx > 0 && !fallback && <span className="ml-2 text-[11px] text-faint">(used only when picked in a dialog)</span>}
        </span>
        <span className={cn("block truncate font-mono text-[11px]", a.warn ? "text-warn" : "text-faint")}>
          {a.detail}
          {a.tag && <span className="ml-2 font-sans text-faint">· {a.tag}</span>}
        </span>
      </span>
      {idx !== null && (
        <span className="flex shrink-0 gap-1">
          <button type="button" className="rounded p-1 text-muted hover:bg-white/5 hover:text-ink disabled:opacity-30" aria-label={`Move ${a.label} up`} disabled={idx === 0} onClick={() => move(a.id, -1)}>
            <ArrowUp className="size-4" />
          </button>
          <button type="button" className="rounded p-1 text-muted hover:bg-white/5 hover:text-ink disabled:opacity-30" aria-label={`Move ${a.label} down`} disabled={idx === on.length - 1} onClick={() => move(a.id, 1)}>
            <ArrowDown className="size-4" />
          </button>
        </span>
      )}
    </li>
  );
  return (
    <div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mb-2 text-xs text-faint">{hint}</p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {on.map((id, i) => row(all.find((a) => a.id === id)!, i))}
        {off.map((a) => row(a, null))}
      </ul>
    </div>
  );
}

function AddCompatible({ presets, onAdded, count }: { presets: Preset[]; onAdded: () => Promise<void>; count: number }) {
  const [presetId, setPresetId] = useState(count === 0 ? "openrouter" : "groq");
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];
  const [form, setForm] = useState({ label: "", baseUrl: "", key: "", textModel: "", imageModel: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setForm({ label: preset.id === "custom" ? "" : preset.label.replace(/ \(this computer\)$/, ""), baseUrl: preset.baseUrl, key: "", textModel: preset.textModel, imageModel: preset.imageModel });
  }, [preset]);
  if (count >= 8) return null;

  async function add() {
    if (!form.label.trim() || !form.baseUrl.trim()) return toast.error("Give it a name and a base URL.");
    if (!form.textModel.trim()) return toast.error("Enter a writing model name (you can load the full list after adding it).");
    setBusy(true);
    try {
      await api("/api/admin/ai/providers", { method: "POST", json: { ...form, key: form.key || undefined } });
      toast.success(`${form.label} added — press Test on its card`);
      await onAdded();
      setForm({ ...form, key: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <Card className="border-dashed">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Plus className="size-4 text-accent-2" aria-hidden /> Add a service
      </h3>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="add-preset" className="mb-1 block text-xs text-muted">
            Service
          </label>
          <select id="add-preset" className={cn(inputCls, "[color-scheme:dark]")} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-faint">
            {preset.note}{" "}
            {preset.keyUrl && (
              <a href={preset.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-2 hover:underline">
                Get a key <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="add-label" className="mb-1 block text-xs text-muted">
              Name
            </label>
            <input id="add-label" className={inputCls} maxLength={40} value={form.label} onChange={set("label")} placeholder="e.g. Groq" />
          </div>
          <div>
            <label htmlFor="add-base" className="mb-1 block text-xs text-muted">
              Base URL
            </label>
            <input id="add-base" className={cn(inputCls, "font-mono")} value={form.baseUrl} onChange={set("baseUrl")} placeholder="https://…/v1" />
          </div>
        </div>
        <div>
          <label htmlFor="add-key" className="mb-1 block text-xs text-muted">
            API key {preset.id === "ollama" || preset.id === "lmstudio" ? "(not needed)" : ""}
          </label>
          <input id="add-key" type="password" autoComplete="off" spellCheck={false} className={cn(inputCls, "font-mono")} value={form.key} onChange={set("key")} placeholder="Paste your API key" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="add-tm" className="mb-1 block text-xs text-muted">
              Writing model
            </label>
            <input id="add-tm" className={cn(inputCls, "font-mono")} value={form.textModel} onChange={set("textModel")} placeholder="model name" />
          </div>
          <div>
            <label htmlFor="add-im" className="mb-1 block text-xs text-muted">
              Image model (optional)
            </label>
            <input id="add-im" className={cn(inputCls, "font-mono")} value={form.imageModel} onChange={set("imageModel")} placeholder="leave empty if none" />
          </div>
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={add} loading={busy}>
          <Plus className="size-4" aria-hidden /> Add {form.label || "service"}
        </Button>
      </div>
    </Card>
  );
}

function ProviderCard({ slot, info, onChanged, roles }: { slot: Slot; info: KInfo; onChanged: () => Promise<void>; roles: string }) {
  const id = slot.id;
  const isCompat = slot.kind === "compatible";
  const [key, setKey] = useState("");
  const [label, setLabel] = useState(slot.label);
  const [textModel, setTextModel] = useState(slot.textModel || info.text);
  const [imageModel, setImageModel] = useState(slot.imageModel || info.image);
  const [baseUrl, setBaseUrl] = useState(slot.baseUrl);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState<"" | "save" | "test" | "models" | "remove">("");

  useEffect(() => {
    setLabel(slot.label);
    setTextModel(slot.textModel || info.text);
    setImageModel(slot.imageModel || info.image);
    setBaseUrl(slot.baseUrl);
  }, [slot, info]);

  async function save() {
    if (!slot.configured && !key.trim() && !isCompat) return toast.error("Paste an API key first.");
    setBusy("save");
    try {
      await api(`/api/admin/ai/providers/${id}`, { method: "PUT", json: { key: key || undefined, textModel, imageModel, ...(isCompat ? { baseUrl, label } : {}) } });
      setKey("");
      toast.success(`${isCompat ? label : info.name} saved`);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy("");
    }
  }
  async function test() {
    setBusy("test");
    try {
      const r = await api<{ reply: string; model: string; ms: number }>(`/api/admin/ai/providers/${id}/test`, { method: "POST" });
      toast.success(`${slot.label} works — ${r.model} answered "${r.reply}" in ${(r.ms / 1000).toFixed(1)} s`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed", { duration: 12000 });
    } finally {
      setBusy("");
      void onChanged();
    }
  }
  async function loadModels() {
    setBusy("models");
    try {
      const r = await api<{ models: string[] }>(`/api/admin/ai/providers/${id}/models`);
      setModels(r.models);
      toast.success(`${r.models.length} models available for your key — pick one in the fields below`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not list models", { duration: 9000 });
    } finally {
      setBusy("");
    }
  }
  async function remove() {
    if (!confirm(`Remove ${slot.label} from this site?`)) return;
    setBusy("remove");
    try {
      await api(`/api/admin/ai/providers/${id}`, { method: "DELETE" });
      toast.success("Removed");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy("");
    }
  }

  const listId = `models-${id}`;
  const canPdf = isCompat ? slot.canPdf : info.canPdf;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{isCompat ? slot.label : info.name}</h2>
          <p className="mt-1 text-xs text-faint">
            {isCompat ? "OpenAI-compatible · " : ""}Text · images in{canPdf ? " · PDFs" : " · no PDFs"}
            {info.canImage ? " · image generation (with an image model)" : " · no image generation"}
          </p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", slot.configured ? (slot.keyOk ? "bg-success/15 text-success" : "bg-warn/15 text-warn") : "bg-white/10 text-muted")}>
          {slot.configured ? (slot.keyOk ? `Connected${slot.last4 ? ` · ••••${slot.last4}` : ""}` : "Key unreadable — re-enter") : "Not set up"}
        </span>
      </div>
      {roles && <p className="mt-2 text-xs text-accent-2">{roles}</p>}
      <div className="mt-5 space-y-4">
        {isCompat && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-label`} className="mb-1 block text-xs text-muted">
                Name
              </label>
              <input id={`${id}-label`} className={inputCls} maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label htmlFor={`${id}-base`} className="mb-1 block text-xs text-muted">
                Base URL
              </label>
              <input id={`${id}-base`} className={cn(inputCls, "font-mono")} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" />
            </div>
          </div>
        )}
        <div>
          <label htmlFor={`${id}-key`} className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>API key {slot.configured && "(leave empty to keep the saved one)"}</span>
            {!isCompat && (
              <a href={info.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-2 hover:underline">
                Get a key <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input id={`${id}-key`} type="password" autoComplete="off" spellCheck={false} className={cn(inputCls, "pl-9 font-mono")} value={key} onChange={(e) => setKey(e.target.value)} placeholder={slot.configured ? `••••••••${slot.last4}` : "Paste your API key"} />
          </div>
        </div>
        <div className={cn("grid gap-4", info.canImage && "sm:grid-cols-2")}>
          <div>
            <label htmlFor={`${id}-tm`} className="mb-1 block text-xs text-muted">
              Writing model
            </label>
            <input id={`${id}-tm`} list={listId} className={cn(inputCls, "font-mono")} value={textModel} onChange={(e) => setTextModel(e.target.value)} placeholder={info.text || "model name"} />
          </div>
          {info.canImage && (
            <div>
              <label htmlFor={`${id}-im`} className="mb-1 block text-xs text-muted">
                Image model (optional)
              </label>
              <input id={`${id}-im`} list={listId} className={cn(inputCls, "font-mono")} value={imageModel} onChange={(e) => setImageModel(e.target.value)} placeholder={info.image || "image model name"} />
            </div>
          )}
          <datalist id={listId}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <p className="text-xs text-faint">Type any model name — new models work as soon as your provider releases them. “Load models” lists the ones your key can use.</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={save} loading={busy === "save"} disabled={!!busy}>
          <Save className="size-4" aria-hidden /> Save
        </Button>
        {slot.configured && (
          <>
            <Button variant="outline" onClick={test} loading={busy === "test"} disabled={!!busy}>
              <PlugZap className="size-4" aria-hidden /> Test
            </Button>
            <Button variant="outline" onClick={loadModels} loading={busy === "models"} disabled={!!busy}>
              <ListRestart className="size-4" aria-hidden /> Load models
            </Button>
          </>
        )}
        {(slot.configured || isCompat) && (
          <Button variant="ghost" onClick={remove} loading={busy === "remove"} disabled={!!busy} aria-label={`Remove ${slot.label}`}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </Card>
  );
}
