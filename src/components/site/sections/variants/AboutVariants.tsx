import { MapPin, Sparkles, Quote } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { arr, num, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import { Counter } from "../Counter";
import { TiltCard } from "../TiltCard";
import type { SectionProps } from "../types";

/* ───────────── Bento grid ───────────── */
export function AboutBento({ section, settings, index }: SectionProps) {
  const c = section.config;
  const p = settings.profile;
  const photo = str(c.photo) || p.avatar;
  const photos = arr(c.photos);
  const stats = section.items;
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={str(c.heading) || section.subtitle} />
        <div className="grid auto-rows-[minmax(140px,auto)] gap-4 md:grid-cols-4">
          {photo && (
            <Reveal className="md:col-span-2 md:row-span-2">
              <TiltCard max={6} className="glow-border h-full overflow-hidden rounded-3xl">
                <img src={photo} alt={`Photo of ${p.name}`} loading="lazy" className="size-full min-h-[320px] object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5">
                  <p className="font-display text-xl text-ink">{p.name}</p>
                  {p.headline && <p className="text-sm text-muted">{p.headline}</p>}
                </div>
              </TiltCard>
            </Reveal>
          )}
          <Reveal delay={0.05} className="glass rounded-3xl p-6 md:col-span-2 md:row-span-2">
            <p className="eyebrow mb-3">My story</p>
            <Markdown>{str(c.bio)}</Markdown>
          </Reveal>
          {stats.slice(0, 4).map((it, i) => (
            <Reveal key={it.id} delay={0.08 + i * 0.05} className="glass glow-border flex flex-col justify-end rounded-3xl p-6">
              <p className="font-display text-4xl font-semibold text-ink">
                <Counter value={num(it.data.value)} suffix={str(it.data.suffix)} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted">{str(it.data.label)}</p>
            </Reveal>
          ))}
          {arr(c.facts).length > 0 && (
            <Reveal delay={0.1} className="glass rounded-3xl p-6 md:col-span-2">
              <p className="eyebrow mb-3">Quick facts</p>
              <ul className="flex flex-wrap gap-2">
                {arr(c.facts).map((f) => (
                  <li key={f} className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-ink/90">
                    {f}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
          {p.location && (
            <Reveal delay={0.12} className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--accent-2)_30%,transparent),transparent_60%)] p-6">
              <MapPin className="size-6 text-accent-2" aria-hidden />
              <p className="mt-6 text-xs uppercase tracking-wider text-muted">Based in</p>
              <p className="font-display text-2xl text-ink">{p.location}</p>
            </Reveal>
          )}
          {arr(c.interests).length > 0 && (
            <Reveal delay={0.14} className="glass rounded-3xl p-6">
              <p className="eyebrow mb-3 flex items-center gap-2">
                <Sparkles className="size-3.5" aria-hidden /> Interests
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {arr(c.interests).map((f) => (
                  <li key={f} className="rounded-md border border-line px-2 py-1 text-xs text-muted">
                    {f}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
          {photos.slice(0, 2).map((src, i) => (
            <Reveal key={src + i} delay={0.16 + i * 0.05} className="overflow-hidden rounded-3xl border border-line">
              <img src={src} alt="" loading="lazy" className="size-full min-h-[160px] object-cover transition duration-700 hover:scale-105" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Story chapters ───────────── */
export function AboutChapters({ section, settings, index }: SectionProps) {
  const c = section.config;
  const p = settings.profile;
  const photo = str(c.photo) || p.avatar;
  // Each paragraph of the bio becomes a chapter (separate paragraphs with a blank line in the admin).
  const chapters = str(c.bio)
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={str(c.heading) || section.subtitle} />
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            {photo && (
              <Reveal>
                <div className="glow-border overflow-hidden rounded-[2rem]">
                  <img src={photo} alt={`Photo of ${p.name}`} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </div>
              </Reveal>
            )}
            {section.items.length > 0 && (
              <ul className="mt-6 grid grid-cols-2 gap-3">
                {section.items.slice(0, 4).map((it) => (
                  <li key={it.id} className="glass rounded-2xl p-4">
                    <p className="font-display text-2xl font-semibold text-ink">
                      <Counter value={num(it.data.value)} suffix={str(it.data.suffix)} />
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-muted">{str(it.data.label)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ol className="relative space-y-6 border-l border-line pl-8">
            {chapters.map((ch, i) => (
              <Reveal as="li" key={i} delay={0.05} className="relative">
                <span aria-hidden className="absolute -left-[42px] top-1 grid size-5 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <p className="eyebrow mb-2">Chapter {String(i + 1).padStart(2, "0")}</p>
                <div className="glass rounded-3xl p-6 text-[17px]">
                  <Markdown>{ch}</Markdown>
                </div>
              </Reveal>
            ))}
            {arr(c.facts).length > 0 && (
              <Reveal as="li" className="relative">
                <span aria-hidden className="absolute -left-[42px] top-1 grid size-5 place-items-center rounded-full bg-white/10">
                  <Quote className="size-3 text-accent-2" />
                </span>
                <p className="eyebrow mb-2">Today</p>
                <ul className="flex flex-wrap gap-2">
                  {[...arr(c.facts), ...arr(c.interests)].map((f) => (
                    <li key={f} className="glass rounded-full px-4 py-2 text-sm text-ink/90">
                      {f}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </ol>
        </div>
      </div>
    </section>
  );
}
