import { ArrowUpRight } from "lucide-react";
import { arr, formatMonth, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import type { SectionProps } from "./types";

export function Blog({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ul className="grid gap-6 md:grid-cols-3">
          {section.items.map((it, i) => {
            const d = it.data;
            const href = str(d.url);
            const Inner = (
              <article className="glass group h-full overflow-hidden rounded-3xl transition hover:-translate-y-1">
                {str(d.cover) && <img src={str(d.cover)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-105" />}
                <div className="p-6">
                  <p className="font-mono text-xs text-faint">{formatMonth(d.date)}</p>
                  <h3 className="mt-1 flex items-start justify-between gap-3 font-display text-xl font-semibold text-ink">
                    {str(d.title)}
                    {href && <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted transition group-hover:text-accent-2" aria-hidden />}
                  </h3>
                  {str(d.excerpt) && <p className="mt-2 text-sm text-muted">{str(d.excerpt)}</p>}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {arr(d.tags).map((t) => (
                      <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-muted">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
            return (
              <Reveal as="li" key={it.id} delay={i * 0.08}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
                    {Inner}
                  </a>
                ) : (
                  Inner
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
