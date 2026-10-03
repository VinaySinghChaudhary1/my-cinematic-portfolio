"use client";
import { cn } from "@/lib/utils";
import { inputCls } from "../ui";
import type { AiStatus } from "./useAiStatus";

/** "Auto (Gemini → OpenRouter)" or one specific provider — shown in every AI dialog. */
export function ProviderPicker({ status, kind, value, onChange, needsPdf, className, id = `ai-pick-${kind}` }: { status: AiStatus; kind: "text" | "image" | "logo"; value: string; onChange: (v: string) => void; needsPdf?: boolean; className?: string; id?: string }) {
  const byId = Object.fromEntries(status.options.map((o) => [o.id, o]));
  const textOrder = status.textOrder.filter((id) => byId[id]);
  const chainNames = (kind === "image" ? status.imageOrder : textOrder).map((id) => (id === "svg" ? "SVG" : byId[id]?.label)).filter(Boolean);
  const auto = status.fallback && chainNames.length > 1 ? `Auto · ${chainNames.join(" → ")}` : `Auto · ${chainNames[0] ?? "default"}`;
  const opts = kind === "image" ? status.options.filter((o) => o.hasImageModel) : status.options.filter((o) => o.textModel);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        AI provider
      </label>
      <select id={id} className={cn(inputCls, "[color-scheme:dark]")} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="auto">{auto}</option>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label} · {kind === "image" ? o.imageModel : o.textModel}
            {needsPdf && !o.canPdf ? " (can't read PDFs)" : ""}
          </option>
        ))}
        {kind === "image" && <option value="svg">Vector drawing (SVG) · free with any writing model</option>}
      </select>
    </div>
  );
}
