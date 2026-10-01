import { Sparkles } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { arr, num, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import { Counter } from "./Counter";
import { TiltCard } from "./TiltCard";
import type { SectionProps } from "./types";

export function About({ section, settings, index }: SectionProps) {
  const c = section.config;
  const photo = str(c.photo) || settings.profile.avatar;
  const photos = arr(c.photos);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={str(c.heading) || section.subtitle} />
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <div className="relative">
              {photo && (
                <TiltCard className="glow-border overflow-hidden rounded-[2rem] bg-bg-2">
                  <img src={photo} alt={`Photo of ${settings.profile.name}`} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                    <p className="font-display text-lg text-ink">{settings.profile.name}</p>
                    {settings.profile.headline && <p className="text-sm text-muted">{settings.profile.headline}</p>}
                  </div>
                </TiltCard>
              )}
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {photos.slice(0, 4).map((src, i) => (
                    <img key={i} src={src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-2xl border border-line object-cover" />
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <div>
            <Reveal delay={0.1}>
              <Markdown>{str(c.bio)}</Markdown>
            </Reveal>

            {arr(c.facts).length > 0 && (
              <Reveal delay={0.15}>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {arr(c.facts).map((f) => (
                    <li key={f} className="glass rounded-full px-4 py-2 text-sm text-ink/90">
                      {f}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {section.items.length > 0 && (
              <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {section.items.map((it, i) => (
                  <Reveal as="li" key={it.id} delay={0.1 + i * 0.07} className="glass glow-border rounded-2xl p-5">
                    <p className="font-display text-3xl font-semibold text-ink md:text-4xl">
                      <Counter value={num(it.data.value)} suffix={str(it.data.suffix)} />
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted">{str(it.data.label)}</p>
                  </Reveal>
                ))}
              </ul>
            )}

            {arr(c.interests).length > 0 && (
              <Reveal delay={0.2}>
                <div className="mt-10">
                  <p className="eyebrow mb-3 flex items-center gap-2">
                    <Sparkles className="size-3.5" aria-hidden /> Interests
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {arr(c.interests).map((f) => (
                      <li key={f} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
