"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Trophy, ExternalLink } from "lucide-react";
import { formatMonth, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import type { SectionProps } from "./types";

gsap.registerPlugin(ScrollTrigger);

/** Cinematic horizontal "film reel": vertical scrolling moves the cards sideways (desktop, motion allowed). */
export function Achievements({ section, index }: SectionProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const reel = section.config.horizontalReel !== false;

  useEffect(() => {
    if (!reel || !wrap.current || !track.current) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const t = track.current!;
      const distance = () => Math.max(0, t.scrollWidth - window.innerWidth + 80);
      const tween = gsap.to(t, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      const cards = t.querySelectorAll("[data-card]");
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          { rotateY: -18, opacity: 0.4 },
          { rotateY: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 95%", end: "left 55%", scrub: true } },
        );
      });
      return () => tween.kill();
    });
    return () => mm.revert();
  }, [reel, section.items.length]);

  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="relative z-10">
      <div ref={wrap} className="section-pad overflow-hidden lg:flex lg:min-h-screen lg:flex-col lg:justify-center">
        <div className="container-x">
          <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        </div>
        <ul
          ref={track}
          className={
            reel
              ? "flex gap-6 overflow-x-auto px-[max(1rem,calc((100vw-1240px)/2+2.5rem))] pb-6 [perspective:1200px] [scrollbar-width:none] lg:overflow-visible"
              : "container-x grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {section.items.map((it) => {
            const d = it.data;
            return (
              <li key={it.id} data-card className={reel ? "w-[82vw] shrink-0 sm:w-[420px]" : ""}>
                <article className="glass glow-border group h-full overflow-hidden rounded-3xl">
                  <div className="relative overflow-hidden">
                    {str(d.image) ? (
                      <img src={str(d.image)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="grid aspect-[4/3] place-items-center bg-white/5">
                        <Trophy className="size-12 text-warn" aria-hidden />
                      </div>
                    )}
                    {str(d.category) && (
                      <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[11px] uppercase tracking-wider text-warn backdrop-blur">
                        {str(d.category)}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="font-mono text-xs text-faint">{formatMonth(d.date)}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-ink">{str(d.title)}</h3>
                    {str(d.organization) && <p className="text-sm text-accent-2">{str(d.organization)}</p>}
                    {str(d.description) && <p className="mt-3 text-sm leading-relaxed text-muted">{str(d.description)}</p>}
                    {str(d.link) && (
                      <a href={str(d.link)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-ink hover:text-accent-2">
                        Details <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
