import { GraduationCap, MapPin, ExternalLink } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { arr, cn, formatRange, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import { TimelineLine } from "./Timeline";
import type { SectionProps } from "./types";

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "border-success/40 text-success bg-success/10" },
  ongoing: { label: "Ongoing", cls: "border-accent-2/40 text-accent-2 bg-accent-2/10" },
  upcoming: { label: "Upcoming", cls: "border-warn/40 text-warn bg-warn/10" },
};

export function Education({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ol className="relative space-y-10 md:space-y-16">
          <TimelineLine />
          {section.items.map((it, i) => {
            const d = it.data;
            const st = STATUS[str(d.status)] ?? STATUS.completed;
            const left = i % 2 === 0;
            return (
              <li key={it.id} className="relative grid md:grid-cols-2 md:gap-16">
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-6 z-10 size-[17px] rounded-full border-2 border-bg md:left-1/2 md:-translate-x-1/2",
                    str(d.status) === "upcoming" ? "bg-warn" : str(d.status) === "ongoing" ? "bg-accent-2 shadow-[0_0_16px_var(--accent-2)]" : "bg-accent",
                  )}
                />
                <Reveal className={cn("pl-12 md:pl-0", left ? "md:col-start-1 md:text-right" : "md:col-start-2")}>
                  <article className={cn("glass glow-border rounded-3xl p-6 text-left transition hover:-translate-y-1 md:p-7", str(d.status) === "upcoming" && "border-dashed")}>
                    <div className="flex items-start gap-4">
                      {str(d.logo) ? (
                        <img src={str(d.logo)} alt="" className="size-12 shrink-0 rounded-xl border border-line object-cover" loading="lazy" />
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/5">
                          <GraduationCap className="size-5 text-accent-2" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider", st.cls)}>{st.label}</span>
                          <span className="font-mono text-xs text-faint">{formatRange(d.startDate, d.endDate, "Present")}</span>
                        </div>
                        <h3 className="mt-2 font-display text-xl font-semibold text-ink">{str(d.degree)}</h3>
                        <p className="text-muted">
                          {str(d.institution)}
                          {str(d.field) && <span className="text-faint"> · {str(d.field)}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      {str(d.grade) && <span>🎓 {str(d.grade)}</span>}
                      {str(d.location) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden /> {str(d.location)}
                        </span>
                      )}
                    </div>
                    {str(d.description) && <Markdown className="prose-dark mt-3 text-sm">{str(d.description)}</Markdown>}
                    {arr(d.courses).length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Key courses">
                        {arr(d.courses).map((c) => (
                          <li key={c} className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-muted">
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {str(d.link) && (
                      <a href={str(d.link)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-accent-2 hover:underline">
                        Learn more <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
