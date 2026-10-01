"use client";
import { createContext, useContext, useState } from "react";
import { Check, ExternalLink, Zap } from "lucide-react";
import type { FieldDef } from "@/lib/registry";
import { cn } from "@/lib/utils";

/** Which section the form belongs to — lets the picker show thumbnails and build preview links. */
export const SectionFormContext = createContext<{ sectionKey?: string; sectionType?: string }>({});

function Thumb({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span className="grid aspect-[16/10] w-full place-items-center bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--accent)_35%,transparent),transparent_60%),radial-gradient(circle_at_80%_80%,color-mix(in_oklab,var(--accent-2)_30%,transparent),transparent_60%)] font-display text-sm text-ink/80">
        {label}
      </span>
    );
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="aspect-[16/10] w-full object-cover object-top" />;
}

/** Visual design picker: one card per layout with a real screenshot, description and a preview link. */
export function LayoutPicker({ field, value, onChange, id }: { field: FieldDef; value: string; onChange: (v: string) => void; id: string }) {
  const { sectionKey, sectionType } = useContext(SectionFormContext);
  const options = field.options ?? [];
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <div key={o.value} className={cn("overflow-hidden rounded-2xl border-2 bg-black/20 transition", on ? "border-accent-2 shadow-[0_0_30px_-10px_var(--accent-2)]" : "border-line hover:border-white/25")}>
            <button type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} className="block w-full text-left">
              <span className="relative block">
                {sectionType && <Thumb src={`/layouts/${sectionType}-${o.value}.webp`} label={o.label} />}
                {on && (
                  <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-accent-2 text-bg">
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
              </span>
              <span className="block p-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {o.label}
                  {o.heavy && (
                    <span title="Uses 3D / WebGL" className="inline-flex items-center gap-0.5 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-medium text-warn">
                      <Zap className="size-3" aria-hidden /> 3D
                    </span>
                  )}
                </span>
                {o.description && <span className="mt-1 block text-xs leading-relaxed text-muted">{o.description}</span>}
              </span>
            </button>
            {sectionKey && (
              <a
                href={`/?preview=${encodeURIComponent(`${sectionKey}:${o.value}`)}#${sectionKey}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 border-t border-line px-3 py-2 text-xs text-accent-2 hover:bg-white/5"
              >
                Preview on site <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
