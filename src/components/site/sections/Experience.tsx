import { Briefcase, MapPin, ExternalLink } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { arr, formatRange, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import type { SectionProps } from "./types";

const KIND: Record<string, string> = {
  internship: "Internship",
  job: "Job",
  freelance: "Freelance",
  club: "Club",
  volunteer: "Volunteering",
  leadership: "Leadership",
};

export function Experience({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ul className="grid gap-5">
          {section.items.map((it, i) => {
            const d = it.data;
            return (
              <Reveal as="li" key={it.id} delay={i * 0.06}>
                <article className="glass group grid gap-5 rounded-3xl p-6 transition hover:border-accent/40 md:grid-cols-[200px_1fr] md:p-8">
                  <div className="flex items-start gap-3 md:flex-col">
                    {str(d.logo) ? (
                      <img src={str(d.logo)} alt="" className="size-12 rounded-xl border border-line object-cover" loading="lazy" />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-xl bg-white/5">
                        <Briefcase className="size-5 text-accent-2" aria-hidden />
                      </span>
                    )}
                    <div>
                      <p className="font-mono text-xs text-faint">{formatRange(d.startDate, d.endDate)}</p>
                      {KIND[str(d.kind)] && <p className="mt-1 text-xs uppercase tracking-wider text-accent-2">{KIND[str(d.kind)]}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-ink">{str(d.role)}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-muted">
                      {str(d.organization)}
                      {str(d.location) && (
                        <span className="inline-flex items-center gap-1 text-sm text-faint">
                          <MapPin className="size-3.5" aria-hidden /> {str(d.location)}
                        </span>
                      )}
                    </p>
                    {str(d.description) && <Markdown className="prose-dark mt-3 text-sm">{str(d.description)}</Markdown>}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {arr(d.skills).map((s) => (
                        <span key={s} className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-muted">
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
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
