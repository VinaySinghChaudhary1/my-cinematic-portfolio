import { Quote } from "lucide-react";
import { str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import type { SectionProps } from "./types";

export function Testimonials({ section, index }: SectionProps) {
  const list = section.items;
  const loop = list.length >= 3 ? [...list, ...list] : list;
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10 overflow-hidden">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
      </div>
      <div className="[mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <ul className={list.length >= 3 ? "animate-marquee flex w-max gap-6" : "container-x grid gap-6 md:grid-cols-2"}>
          {loop.map((it, i) => {
            const d = it.data;
            return (
              <li key={`${it.id}-${i}`} aria-hidden={i >= list.length ? true : undefined} className={list.length >= 3 ? "w-[340px] shrink-0 sm:w-[420px]" : ""}>
                <figure className="glass h-full rounded-3xl p-7">
                  <Quote className="size-7 text-accent" aria-hidden />
                  <blockquote className="mt-4 text-[15px] leading-relaxed text-ink/90">“{str(d.quote)}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    {str(d.avatar) && <img src={str(d.avatar)} alt="" className="size-11 rounded-full object-cover" loading="lazy" />}
                    <span>
                      <span className="block font-medium text-ink">
                        {str(d.link) ? (
                          <a href={str(d.link)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {str(d.name)}
                          </a>
                        ) : (
                          str(d.name)
                        )}
                      </span>
                      <span className="block text-sm text-muted">{str(d.role)}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
