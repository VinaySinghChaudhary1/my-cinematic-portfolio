import { cn, num, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import type { SectionProps } from "../types";

type Skill = { name: string; category: string; level: number; icon: string; years: number };

function useSkills(section: SectionProps["section"]) {
  const skills: Skill[] = section.items.map((i) => ({
    name: str(i.data.name),
    category: str(i.data.category) || "Other",
    level: num(i.data.level, 0),
    icon: str(i.data.icon),
    years: num(i.data.years, 0),
  }));
  const groups = new Map<string, Skill[]>();
  for (const s of skills) groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
  return { skills, groups: [...groups.entries()] };
}

function Chip({ s }: { s: Skill }) {
  return (
    <span className="glass inline-flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-ink">
      <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-sm" aria-hidden>
        {s.icon || s.name[0]}
      </span>
      <span className="font-medium">{s.name}</span>
      {s.level > 0 && <span className="font-mono text-xs text-faint">{s.level}%</span>}
    </span>
  );
}

/* ───────────── Logo marquee ───────────── */
export function SkillsMarquee({ section, index }: SectionProps) {
  const { groups } = useSkills(section);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10 overflow-hidden">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
      </div>
      <div className="space-y-6">
        {groups.map(([cat, list], gi) => {
          const loop = list.length < 8 ? [...list, ...list, ...list] : [...list, ...list];
          return (
            <div key={cat}>
              <p className="container-x eyebrow mb-3">{cat}</p>
              <div className="[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
                <ul className={cn("flex w-max gap-4", gi % 2 ? "animate-marquee-rev" : "animate-marquee")} style={{ animationDuration: `${30 + list.length * 3}s` }}>
                  {loop.map((s, i) => (
                    <li key={`${s.name}-${i}`} aria-hidden={i >= list.length ? true : undefined}>
                      <Chip s={s} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Radar chart ───────────── */
export function SkillsRadar({ section, index }: SectionProps) {
  const { groups } = useSkills(section);
  const axes = groups.map(([cat, list]) => ({ cat, value: Math.round(list.reduce((a, s) => a + s.level, 0) / Math.max(1, list.length)) }));
  const N = Math.max(3, axes.length);
  const R = 150;
  const C = 200;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [C + Math.cos(a) * r, C + Math.sin(a) * r];
  };
  const poly = axes.map((a, i) => pt(i, (a.value / 100) * R).join(",")).join(" ");
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <figure className="glass mx-auto max-w-[520px] rounded-[2rem] p-4">
              <svg viewBox="0 0 400 400" role="img" aria-label={`Skill strength by category: ${axes.map((a) => `${a.cat} ${a.value}%`).join(", ")}`} className="w-full">
                <defs>
                  <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
                    <stop offset="1" stopColor="var(--accent-2)" stopOpacity="0.35" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <polygon key={f} points={Array.from({ length: N }, (_, i) => pt(i, R * f).join(",")).join(" ")} fill="none" stroke="rgb(255 255 255 / 0.1)" />
                ))}
                {axes.map((_, i) => {
                  const [x, y] = pt(i, R);
                  return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="rgb(255 255 255 / 0.08)" />;
                })}
                <polygon points={poly} fill="url(#radar-fill)" stroke="var(--accent-2)" strokeWidth="2" />
                {axes.map((a, i) => {
                  const [x, y] = pt(i, (a.value / 100) * R);
                  const [lx, ly] = pt(i, R + 26);
                  return (
                    <g key={a.cat}>
                      <circle cx={x} cy={y} r="4.5" fill="white" />
                      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#eeedf9" fontSize="12" fontFamily="var(--font-display)">
                        {a.cat}
                      </text>
                      <text x={lx} y={ly + 14} textAnchor="middle" dominantBaseline="middle" fill="#a3a1c2" fontSize="10" fontFamily="var(--font-mono)">
                        {a.value}%
                      </text>
                    </g>
                  );
                })}
              </svg>
            </figure>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map(([cat, list], i) => (
              <Reveal key={cat} delay={i * 0.06} className="glass rounded-2xl p-5">
                <p className="eyebrow mb-3">{cat}</p>
                <ul className="space-y-2">
                  {list.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink">
                        <span aria-hidden className="mr-2">
                          {s.icon}
                        </span>
                        {s.name}
                      </span>
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5" aria-label={`${s.level}%`}>
                        <span className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${s.level}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Orbit planets ───────────── */
export function SkillsOrbit({ section, index }: SectionProps) {
  const { groups } = useSkills(section);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10 overflow-hidden">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ul className="grid gap-x-6 gap-y-14 [--r:92px] sm:grid-cols-2 sm:[--r:110px] lg:grid-cols-3 lg:[--r:118px]">
          {groups.map(([cat, list], gi) => {
            const ring = list.slice(0, 8);
            const dur = 26 + gi * 4;
            return (
              <Reveal as="li" key={cat} delay={gi * 0.08}>
                <div className="relative mx-auto aspect-square w-full max-w-[300px]">
                  <div className="absolute inset-[14%] rounded-full border border-dashed border-line" aria-hidden />
                  {/* planet */}
                  <div className="absolute inset-[34%] grid place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--accent-2),var(--accent)_60%,#1a103a)] text-center shadow-[0_0_60px_-10px_var(--accent)]">
                    <span className="px-2 font-display text-sm font-semibold leading-tight text-white">{cat}</span>
                  </div>
                  {/* orbiting skills */}
                  <ul className="absolute inset-0 motion-safe:animate-[orbit_var(--d)_linear_infinite]" style={{ ["--d" as string]: `${dur}s` }} aria-label={`${cat} skills`}>
                    {ring.map((s, i) => {
                      const a = (360 / ring.length) * i;
                      return (
                        <li key={s.name} className="absolute left-1/2 top-1/2 size-0" style={{ transform: `rotate(${a}deg) translateY(calc(-1 * var(--r))) rotate(${-a}deg)` }}>
                          <span className="absolute left-0 top-0 block origin-top-left motion-safe:animate-[orbit-rev_var(--d)_linear_infinite]" style={{ ["--d" as string]: `${dur}s` }}>
                            <span className="glass inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-ink">
                              <span aria-hidden>{s.icon}</span> {s.name}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
