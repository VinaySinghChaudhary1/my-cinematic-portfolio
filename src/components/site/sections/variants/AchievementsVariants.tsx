import { Trophy, Medal, ExternalLink } from "lucide-react";
import { cn, formatMonth, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import type { SectionProps } from "../types";

type Item = SectionProps["section"]["items"][number];

function Small({ it }: { it: Item }) {
  const d = it.data;
  return (
    <article className="glass flex h-full gap-4 rounded-2xl p-4">
      {str(d.image) ? (
        <img src={str(d.image)} alt="" loading="lazy" className="size-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-white/5">
          <Trophy className="size-6 text-warn" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-mono text-[11px] text-faint">
          {formatMonth(d.date)}
          {str(d.category) && ` · ${str(d.category)}`}
        </p>
        <h3 className="font-display font-semibold leading-snug text-ink">{str(d.title)}</h3>
        {str(d.organization) && <p className="text-sm text-accent-2">{str(d.organization)}</p>}
        {str(d.link) && (
          <a href={str(d.link)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
            Details <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}

/* ───────────── Medal podium ───────────── */
export function AchievementsPodium({ section, index }: SectionProps) {
  const [first, second, third, ...rest] = section.items;
  const podium = [
    { it: second, place: 2, h: "h-28 md:h-36", medal: "text-[#cbd5e1]", glow: "from-slate-300/30" },
    { it: first, place: 1, h: "h-40 md:h-52", medal: "text-warn", glow: "from-amber-300/40" },
    { it: third, place: 3, h: "h-20 md:h-28", medal: "text-[#d97706]", glow: "from-orange-500/30" },
  ].filter((p) => p.it);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ol className="grid grid-cols-1 items-end gap-6 sm:grid-cols-3">
          {podium.map(({ it, place, h, medal, glow }, i) => (
            <Reveal as="li" key={it!.id} delay={0.1 + i * 0.12} className={cn(place === 1 ? "sm:order-2" : place === 2 ? "sm:order-1" : "sm:order-3")}>
              <article className="text-center">
                <div className="relative mx-auto mb-4 w-full max-w-[260px] overflow-hidden rounded-3xl border border-line">
                  {str(it!.data.image) ? (
                    <img src={str(it!.data.image)} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-white/5">
                      <Trophy className="size-14 text-warn" aria-hidden />
                    </div>
                  )}
                  <span className={cn("absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/70 backdrop-blur", medal)}>
                    <Medal className="size-5" aria-label={`Rank ${place}`} />
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">{str(it!.data.title)}</h3>
                <p className="text-sm text-accent-2">{str(it!.data.organization)}</p>
                <p className="mt-1 font-mono text-xs text-faint">{formatMonth(it!.data.date)}</p>
                <div className={cn("relative mt-5 flex items-start justify-center overflow-hidden rounded-t-2xl border border-b-0 border-line bg-gradient-to-b to-transparent pt-4", h, glow)}>
                  <span className="font-display text-5xl font-bold text-white/80">{place}</span>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
        {rest.length > 0 && (
          <ul className="mt-12 grid gap-4 md:grid-cols-2">
            {rest.map((it, i) => (
              <Reveal as="li" key={it.id} delay={i * 0.05}>
                <Small it={it} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ───────────── Year timeline ───────────── */
export function AchievementsTimeline({ section, index }: SectionProps) {
  const years = new Map<string, Item[]>();
  for (const it of [...section.items].sort((a, b) => str(b.data.date).localeCompare(str(a.data.date)))) {
    const y = str(it.data.date).slice(0, 4) || "Other";
    years.set(y, [...(years.get(y) ?? []), it]);
  }
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ol className="space-y-12">
          {[...years.entries()].map(([year, list]) => (
            <li key={year} className="grid gap-6 md:grid-cols-[160px_1fr]">
              <Reveal>
                <p className="font-display text-5xl font-bold text-gradient md:sticky md:top-28">{year}</p>
              </Reveal>
              <ul className="grid gap-4 border-l border-line pl-6 sm:grid-cols-2">
                {list.map((it, i) => (
                  <Reveal as="li" key={it.id} delay={i * 0.06}>
                    <Small it={it} />
                    {str(it.data.description) && <p className="mt-2 px-1 text-sm text-muted">{str(it.data.description)}</p>}
                  </Reveal>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
