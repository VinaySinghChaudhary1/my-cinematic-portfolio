"use client";
import { useState } from "react";
import { ImagePlus, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { FieldDef } from "@/lib/registry";
import { cn } from "@/lib/utils";
import { api } from "../api";
import { Button, inputCls } from "../ui";
import { ProviderPicker } from "./ProviderPicker";
import { fallbackNote, useAiStatus, usePick, type AiTarget, type Failed } from "./useAiStatus";

const ACTIONS = [
  { id: "write", label: "Write it for me" },
  { id: "improve", label: "Improve" },
  { id: "professional", label: "More professional" },
  { id: "shorten", label: "Shorter" },
  { id: "expand", label: "Longer" },
  { id: "grammar", label: "Fix grammar" },
] as const;

/** Small "✨" button beside long text fields: rewrite, shorten, fix grammar, or write from the other fields. */
export function AiTextButton({ field, value, onChange, allValues }: { field: FieldDef; value: string; onChange: (v: string) => void; allValues: Record<string, unknown> }) {
  const status = useAiStatus();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [by, setBy] = useState("");
  const [pick, setPick] = usePick("text", status);
  if (!status?.ready) return null;

  async function run(action: string) {
    setBusy(action);
    try {
      const context = Object.fromEntries(Object.entries(allValues).filter(([k, v]) => k !== field.name && (typeof v === "string" || Array.isArray(v)) && String(v).length < 2000));
      const r = await api<{ text: string; provider: string; model: string; failed: Failed[] }>("/api/admin/ai/text", {
        method: "POST",
        json: { action, instruction, text: value, fieldLabel: field.label, markdown: field.type === "markdown", maxLength: field.maxLength, context, provider: pick },
      });
      setDraft(r.text);
      setBy(`${r.provider} · ${r.model}`);
      const note = fallbackNote(r.failed, r.provider);
      if (note) toast.info(note, { duration: 12000 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed", { duration: 15000 });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent-2 hover:bg-white/5" aria-label={`AI help for ${field.label}`}>
        <Sparkles className="size-3.5" aria-hidden /> AI
      </button>
      {open && (
        <Modal open onClose={() => !busy && (setOpen(false), setDraft(null))} title={`AI · ${field.label}`} wide>
          <div className="space-y-4 p-6">
            {status.options.length > 1 && <ProviderPicker status={status} kind="text" value={pick} onChange={setPick} id={`ai-pick-${field.name}`} className="max-w-md" />}
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <Button key={a.id} type="button" variant="outline" onClick={() => run(a.id)} loading={busy === a.id} disabled={!!busy}>
                  {a.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} value={instruction} maxLength={500} onChange={(e) => setInstruction(e.target.value)} placeholder="Or tell it what to do, e.g. “mention the RMSLE result first”" aria-label="Custom instruction" />
              <Button type="button" onClick={() => run("custom")} loading={busy === "custom"} disabled={!!busy || !instruction.trim()}>
                <Wand2 className="size-4" aria-hidden /> Go
              </Button>
            </div>
            {draft !== null && (
              <div className="space-y-3">
                <label htmlFor="ai-draft" className="flex justify-between gap-2 text-xs uppercase tracking-wider text-faint">
                  <span>Suggestion (you can edit it)</span>
                  <span className="normal-case tracking-normal">by {by}</span>
                </label>
                <textarea id="ai-draft" rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(inputCls, field.type === "markdown" && "font-mono text-[13px]")} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                    Discard
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      onChange(draft);
                      setOpen(false);
                      setDraft(null);
                      toast.success("Text updated — save the form to keep it.");
                    }}
                  >
                    Use this text
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

const BLOCKED = /^(avatar|photo|photos|portraitImages)$/;

function defaultKind(field: FieldDef, sectionType?: string): string {
  if (/logo/i.test(field.name)) return "logo";
  if (/icon/i.test(field.name)) return "icon";
  if (sectionType === "gallery") return "portrait";
  if (sectionType === "achievements" || sectionType === "certifications") return "square";
  return "cover";
}

/** "✨ Generate" beside image fields: logos/icons (SVG → image) or covers/artwork (image model). Real photos are never faked. */
export function AiImageButton({ field, allValues, ai, onPick }: { field: FieldDef; allValues: Record<string, unknown>; ai?: AiTarget; onPick: (url: string) => void }) {
  const status = useAiStatus();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(() => defaultKind(field, ai?.sectionType));
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; svg: boolean; by: string } | null>(null);
  const [pick, setPick] = usePick("image", status);
  if (!status?.ready || BLOCKED.test(field.name)) return null;
  const isMark = kind === "logo" || kind === "icon";

  async function generate() {
    setBusy(true);
    try {
      const values = Object.fromEntries(Object.entries(allValues).filter(([, v]) => typeof v === "string" || Array.isArray(v)));
      const provider = isMark ? (pick === "svg" || !status?.options.find((o) => o.id === pick)?.textModel ? "auto" : pick) : pick;
      const r = await api<{ media: { url: string }; svg: boolean; provider: string; model: string; failed: Failed[] }>("/api/admin/ai/image", { method: "POST", json: { kind, description, values, sectionType: ai?.sectionType, provider } });
      setResult({ url: r.media.url, svg: r.svg, by: `${r.svg ? "SVG drawn by " : ""}${r.provider} · ${r.model}` });
      const note = fallbackNote(r.failed, r.svg ? `${r.provider} (SVG)` : r.provider);
      if (note) toast.info(note, { duration: 12000 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image generation failed", { duration: 15000 });
    } finally {
      setBusy(false);
    }
  }

  const rasterNote = status.images === "raster" ? "Covers and artwork use your image model." : "No image model is set, so artwork is drawn as SVG by your text model (add a Gemini or OpenAI key for photo-style images).";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 self-end text-xs text-accent-2 hover:underline" aria-label={`Generate ${field.label} with AI`}>
        <Sparkles className="size-3.5" aria-hidden /> Generate
      </button>
      {open && (
        <Modal open onClose={() => !busy && (setOpen(false), setResult(null))} title={`Generate · ${field.label}`} wide>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <div>
                <label htmlFor="ai-kind" className="mb-1 block text-xs text-muted">
                  Type
                </label>
                <select id="ai-kind" className={cn(inputCls, "[color-scheme:dark]")} value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="logo">Logo / badge (square)</option>
                  <option value="icon">Icon (square)</option>
                  <option value="cover">Cover image (16:9)</option>
                  <option value="square">Square artwork (1:1)</option>
                  <option value="portrait">Portrait artwork (4:5)</option>
                </select>
              </div>
              {!isMark && <ProviderPicker status={status} kind="image" value={pick} onChange={setPick} />}
              <div>
                <label htmlFor="ai-desc" className="mb-1 block text-xs text-muted">
                  Describe it (optional — the form&apos;s title and description are used too)
                </label>
                <textarea id="ai-desc" rows={5} className={inputCls} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. a neural-network graph with glowing nodes; or: monogram 'IITM' badge in saffron" />
              </div>
              <p className="text-xs text-faint">{isMark ? "Logos and icons are drawn as clean vector art by your writing model, then saved as an image." : rasterNote} Images are saved to your media library.</p>
              <Button type="button" onClick={generate} loading={busy} className="w-full">
                {result ? <RefreshCw className="size-4" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />} {busy ? "Creating… (up to a minute)" : result ? "Try again" : "Generate"}
              </Button>
            </div>
            <div className="grid min-h-60 place-items-center overflow-hidden rounded-2xl border border-line bg-black/40">
              {result ? <img src={result.url} alt="Generated preview" className="max-h-[50dvh] w-auto object-contain" /> : <p className="p-6 text-center text-sm text-faint">{busy ? "Working on it…" : "Preview appears here"}</p>}
            </div>
            {result && <p className="text-xs text-faint md:col-span-2">Made by {result.by} — saved in Media → “ai”.</p>}
            {result && (
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setResult(null)}>
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onPick(result.url);
                    setOpen(false);
                    setResult(null);
                    toast.success("Image added — save the form to keep it.");
                  }}
                >
                  Use this image
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
