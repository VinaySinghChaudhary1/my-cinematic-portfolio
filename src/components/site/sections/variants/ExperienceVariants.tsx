"use client";
import { useState } from "react";
import { Briefcase, MapPin, ExternalLink } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { arr, cn, formatRange, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import type { SectionProps } from "../types";

const KIND: Record<string, string> = {
  internship: "Internships",
  job: "Jobs",
  freelance: "Freelance",
  club: "Clubs",
  volunteer: "Volunteering",
  leadership: "Leadership",
};

function Role({ d, compact }: { d: Record<string, unknown>; compact?: boolean }) {
  return (
    <div>
      <div className="flex items-start gap-4">
        {str(d.logo) ? (
          <img src={str(d.logo)} alt="" className="size-12 shrink-0 rounded-xl border border-line object-cover" loading="lazy" />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/5">
            <Briefcase className="size-5 text-accent-2" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold text-ink">{str(d.role)}</h3>
          <p className="flex flex-wrap items-center gap-x-3 text-muted">
            {str(d.organization)}
            {str(d.location) && (
              <span className="inline-flex items-center gap-1 text-sm text-faint">
                <MapPin className="size-3.5" aria-hidden /> {str(d.location)}
              </span>
            )}
          </p>
          <p className="mt-1 font-mono text-xs text-faint">{formatRange(d.startDate, d.endDate)}</p>
        </div>
      </div>
      {!compact && str(d.description) && <Markdown className="prose-dark mt-3 text-sm">{str(d.description)}</Markdown>}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {arr(d.skills).map((s) => (
          <span key={s} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-muted">
            {s}
          </span>
        ))}
        {str(d.link) && (
          <a href={str(d.link)} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-accent-2 hover:underline">
            Visit <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}

/* ───────────── Vertical timeline ───────────── */
export function ExperienceTimeline({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x max-w-4xl">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ol className="relative space-y-10 pl-0">
          <li aria-hidden className="absolute bottom-0 left-[19px] top-0 w-px bg-gradient-to-b from-accent-2 via-accent to-transparent shadow-[0_0_12px_var(--accent)]" />
          {section.items.map((it, i) => (
            <li key={it.id} className="relative pl-12">
              <span aria-hidden className={cn("absolute left-[11px] top-5 z-10 size-[17px] rounded-full border-2 border-bg", str(it.data.endDate) ? "bg-accent" : "bg-success shadow-[0_0_14px_var(--color-success)]")} />
              <Reveal delay={i * 0.05}>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-accent-2">{KIND[str(it.data.kind)]?.replace(/s$/, "") ?? "Experience"}</p>
                <div className="glass rounded-3xl p-6">
                  <Role d={it.data} />
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Tabs by type ───────────── */
export function ExperienceTabs({ section, index }: SectionProps) {
  const kinds = Array.from(new Set(section.items.map((i) => str(i.data.kind) || "other")));
  const [tab, setTab] = useState(kinds[0] ?? "other");
  const shown = section.items.filter((i) => (str(i.data.kind) || "other") === tab);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <div role="tablist" aria-label="Experience type" aria-orientation="vertical" className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
            {kinds.map((k) => {
              const n = section.items.filter((i) => (str(i.data.kind) || "other") === k).length;
              return (
                <button
                  key={k}
                  role="tab"
                  id={`exp-tab-${k}`}
                  aria-selected={tab === k}
                  aria-controls="exp-panel"
                  onClick={() => setTab(k)}
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left text-sm transition",
                    tab === k ? "border-accent/60 bg-white/[0.06] text-ink" : "border-line text-muted hover:text-ink",
                  )}
                >
                  {KIND[k] ?? "Other"}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px]">{n}</span>
                </button>
              );
            })}
          </div>
          <div id="exp-panel" role="tabpanel" aria-labelledby={`exp-tab-${tab}`} className="space-y-5">
            {shown.map((it) => (
              <div key={it.id} className="glass rounded-3xl p-6 md:p-8">
                <Role d={it.data} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
