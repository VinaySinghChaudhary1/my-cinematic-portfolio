"use client";
import { useState } from "react";
import { X, ImagePlus, FileText, ArrowLeft, ArrowRight, Eye, Pencil } from "lucide-react";
import type { FieldDef } from "@/lib/registry";
import { Markdown } from "@/components/ui/Markdown";
import { cn } from "@/lib/utils";
import { MediaPicker } from "./MediaPicker";
import { Switch, inputCls } from "./ui";
import { LayoutPicker } from "./LayoutPicker";
import { AiImageButton, AiTextButton } from "./ai/AiFieldTools";
import { AiFillButton } from "./ai/AiFillDialog";
import type { AiTarget } from "./ai/useAiStatus";

type Values = Record<string, unknown>;

function TagsInput({ id, value, onChange, invalid }: { id: string; value: string[]; onChange: (v: string[]) => void; invalid?: boolean }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...value, ...parts])));
    setDraft("");
  };
  return (
    <div className={cn(inputCls, "flex flex-wrap items-center gap-1.5 py-2")} aria-invalid={invalid}>
      {value.map((t, i) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-ink">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-muted hover:text-danger">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : "Type and press Enter"}
        className="min-w-24 flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
      />
    </div>
  );
}

function MediaField({ value, onChange, kind, multiple, label }: { value: string | string[]; onChange: (v: string | string[]) => void; kind: "image" | "pdf"; multiple?: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  const list = multiple ? ((value as string[]) ?? []) : value ? [value as string] : [];
  const move = (i: number, d: number) => {
    const next = [...list];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {list.map((u, i) => (
          <div key={u + i} className="group relative size-24 overflow-hidden rounded-xl border border-line bg-black/40">
            {kind === "image" ? (
              <img src={u} alt="" className="size-full object-cover" />
            ) : (
              <a href={u} target="_blank" rel="noopener" className="grid size-full place-items-center p-2 text-center text-[10px] text-muted">
                <FileText className="mb-1 size-6" aria-hidden /> PDF
              </a>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
              {multiple ? (
                <span className="flex">
                  <button type="button" aria-label="Move left" onClick={() => move(i, -1)} className="p-1 text-white">
                    <ArrowLeft className="size-3.5" />
                  </button>
                  <button type="button" aria-label="Move right" onClick={() => move(i, 1)} className="p-1 text-white">
                    <ArrowRight className="size-3.5" />
                  </button>
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                aria-label="Remove"
                onClick={() => (multiple ? onChange(list.filter((_, j) => j !== i)) : onChange(""))}
                className="p-1 text-danger"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {(multiple || list.length === 0) && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-24 place-items-center rounded-xl border border-dashed border-line text-xs text-muted hover:border-accent hover:text-ink"
            aria-label={`Add ${label}`}
          >
            <span className="flex flex-col items-center gap-1">
              {kind === "image" ? <ImagePlus className="size-5" aria-hidden /> : <FileText className="size-5" aria-hidden />}
              {multiple ? "Add" : "Choose"}
            </span>
          </button>
        )}
        {!multiple && list.length > 0 && (
          <button type="button" onClick={() => setOpen(true)} className="self-end text-xs text-accent-2 hover:underline">
            Replace
          </button>
        )}
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        kind={kind}
        multiple={multiple}
        onPick={(urls) => (multiple ? onChange([...list, ...urls]) : onChange(urls[0] ?? ""))}
      />
    </div>
  );
}

function MarkdownField({ id, value, onChange, invalid, maxLength }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; maxLength?: number }) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex justify-end gap-1">
        <button type="button" onClick={() => setPreview(false)} aria-pressed={!preview} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs", !preview ? "bg-white/10 text-ink" : "text-muted")}>
          <Pencil className="size-3" aria-hidden /> Write
        </button>
        <button type="button" onClick={() => setPreview(true)} aria-pressed={preview} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs", preview ? "bg-white/10 text-ink" : "text-muted")}>
          <Eye className="size-3" aria-hidden /> Preview
        </button>
      </div>
      {preview ? (
        <div className="min-h-40 rounded-xl border border-line bg-black/20 p-4">
          <Markdown>{value || "_Nothing to preview_"}</Markdown>
        </div>
      ) : (
        <textarea id={id} rows={8} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} className={cn(inputCls, "font-mono text-[13px] leading-relaxed")} />
      )}
      <p className="mt-1 text-[11px] text-faint">Markdown: **bold**, _italic_, ## heading, - list, [link](https://…)</p>
    </div>
  );
}

export function FieldControl({
  field,
  value,
  onChange,
  error,
  idPrefix,
  ai,
  allValues,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  idPrefix: string;
  ai?: AiTarget;
  allValues?: Values;
}) {
  const id = `${idPrefix}-${field.name}`;
  const invalid = !!error;
  const describedBy = [field.help ? `${id}-help` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-invalid": invalid, "aria-describedby": describedBy };
  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = <textarea {...common} rows={3} maxLength={field.maxLength} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={field.placeholder} />;
      break;
    case "markdown":
      control = <MarkdownField id={id} value={String(value ?? "")} onChange={onChange} invalid={invalid} maxLength={field.maxLength} />;
      break;
    case "number":
      control = (
        <input {...common} type="number" min={field.min} max={field.max} value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
      );
      break;
    case "date":
      control = <input {...common} type="month" value={String(value ?? "").slice(0, 7)} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "[color-scheme:dark]")} placeholder="YYYY-MM" />;
      break;
    case "layout":
      control = <LayoutPicker field={field} id={id} value={String(value ?? "")} onChange={onChange} />;
      break;
    case "select":
      control = (
        <select {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "[color-scheme:dark]")}>
          {!field.required && <option value="">—</option>}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "tags":
      control = <TagsInput id={id} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} invalid={invalid} />;
      break;
    case "boolean":
      control = <Switch id={id} checked={!!value} onChange={onChange} label={field.label} />;
      break;
    case "image":
      control = <MediaField label={field.label} kind="image" value={String(value ?? "")} onChange={onChange} />;
      break;
    case "images":
      control = <MediaField label={field.label} kind="image" multiple value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
      break;
    case "file":
      control = <MediaField label={field.label} kind="pdf" value={String(value ?? "")} onChange={onChange} />;
      break;
    case "color":
      control = (
        <div className="flex items-center gap-3">
          <input type="color" aria-label={field.label} value={String(value || "#8b5cf6")} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent" />
          <input {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "w-32 font-mono")} />
        </div>
      );
      break;
    default:
      control = (
        <input
          {...common}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          maxLength={field.maxLength}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          placeholder={field.placeholder ?? (field.type === "url" ? "https://" : undefined)}
        />
      );
  }

  const isBool = field.type === "boolean";
  const aiText = ai && allValues && (field.type === "textarea" || field.type === "markdown");
  const aiImage = ai && allValues && (field.type === "image" || field.type === "images");
  const labelEl = (
    <label id={`${id}-label`} htmlFor={["image", "images", "file", "tags", "layout"].includes(field.type) ? undefined : id} className={cn("text-sm font-medium text-ink/90", !isBool && !aiText && !aiImage && "mb-1.5 block")}>
      {field.label}
      {field.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
    </label>
  );
  return (
    <div className={cn(isBool && "flex items-center justify-between gap-4 rounded-xl border border-line bg-black/20 px-4 py-3")}>
      {aiText || aiImage ? (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {labelEl}
          {aiText && <AiTextButton field={field} value={String(value ?? "")} onChange={(v) => onChange(v)} allValues={allValues!} />}
          {aiImage && (
            <AiImageButton
              field={field}
              allValues={allValues!}
              ai={ai}
              onPick={(url) => onChange(field.type === "images" ? [...(Array.isArray(value) ? (value as string[]) : []), url] : url)}
            />
          )}
        </div>
      ) : (
        labelEl
      )}
      {control}
      {field.help && !isBool && (
        <p id={`${id}-help`} className="mt-1 text-xs text-faint">
          {field.help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

export function DynamicForm({
  fields,
  values,
  onChange,
  errors = {},
  idPrefix,
  ai,
}: {
  fields: FieldDef[];
  values: Values;
  onChange: (v: Values) => void;
  errors?: Record<string, string>;
  idPrefix: string;
  /** Turns on the ✨ AI tools for this form. */
  ai?: AiTarget;
}) {
  const full = (f: FieldDef) => ["textarea", "markdown", "images", "tags", "boolean", "layout"].includes(f.type);
  return (
    <div className="space-y-5">
      {ai && (
        <div className="flex justify-end">
          <AiFillButton ai={ai} fields={fields} values={values} onApply={onChange} />
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={cn(full(f) && "md:col-span-2")}>
            <FieldControl field={f} idPrefix={idPrefix} value={values[f.name]} error={errors[f.name]} onChange={(v) => onChange({ ...values, [f.name]: v })} ai={ai} allValues={values} />
          </div>
        ))}
      </div>
    </div>
  );
}
