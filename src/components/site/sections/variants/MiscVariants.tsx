import { Rocket, GraduationCap, Code2, Briefcase, Heart, Quote, ArrowUpRight, CircleDashed, Loader, CheckCircle2 } from "lucide-react";
import { arr, cn, formatMonth, num, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import type { SectionProps } from "../types";

const KIND: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  education: { label: "Education", Icon: GraduationCap },
  project: { label: "Project", Icon: Rocket },
  skill: { label: "Skill", Icon: Code2 },
  career: { label: "Career", Icon: Briefcase },
  personal: { label: "Personal", Icon: Heart },
};

/* ───────────── Roadmap: Kanban board ───────────── */
export function RoadmapKanban({ section, index }: SectionProps) {
  const cols = [
    { key: "planned", label: "Planned", Icon: CircleDashed, cls: "text-warn" },
    { key: "in-progress", label: "In progress", Icon: Loader, cls: "text-accent-2" },
    { key: "done", label: "Done", Icon: CheckCircle2, cls: "text-success" },
  ];
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <div className="grid gap-5 md:grid-cols-3">
          {cols.map((col, ci) => {
            const list = section.items.filter((i) => (str(i.data.status) || "planned") === col.key);
            return (
              <Reveal key={col.key} delay={ci * 0.08} className="rounded-3xl border border-line bg-white/[0.02] p-4">
                <h3 className="mb-4 flex items-center justify-between px-2 font-display text-ink">
                  <span className="flex items-center gap-2">
                    <col.Icon className={cn("size-4", col.cls)} aria-hidden /> {col.label}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-xs text-muted">{list.length}</span>
                </h3>
                <ul className="space-y-3">
                  {list.length === 0 && <li className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-faint">Nothing here yet</li>}
                  {list.map((it) => {
                    const k = KIND[str(it.data.kind)] ?? KIND.project;
                    const pr = Math.max(0, Math.min(100, num(it.data.progress)));
                    return (
                      <li key={it.id} className="glass rounded-2xl p-4">
                        <p className="inline-flex items-center gap-1.5 text-xs text-accent-2">
                          <k.Icon className="size-3.5" aria-hidden /> {k.label}
                        </p>
                        <p className="mt-2 font-medium text-ink">{str(it.data.title)}</p>
                        {str(it.data.description) && <p className="mt-1 text-sm text-muted">{str(it.data.description)}</p>}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={pr} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${pr}%` }} />
                          </div>
                          <span className="font-mono text-[11px] text-faint">{formatMonth(it.data.targetDate) || "TBA"}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Roadmap: Timeline bars (Gantt) ───────────── */
export function RoadmapGantt({ section, index }: SectionProps) {
  const now = new Date();
  const thisMonth = now.getFullYear() * 12 + now.getMonth();
  const toM = (v: unknown) => {
    const [y, m] = str(v).split("-").map(Number);
    return y ? y * 12 + ((m || 1) - 1) : thisMonth + 6;
  };
  const items = section.items.map((i) => ({ i, end: toM(i.data.targetDate) })).sort((a, b) => a.end - b.end);
  const start = thisMonth - 1;
  const last = Math.max(start + 12, ...items.map((x) => x.end + 1));
  const span = last - start;
  const years: { label: string; left: number }[] = [];
  for (let m = start; m <= last; m++) if (m % 12 === 0) years.push({ label: String(m / 12), left: ((m - start) / span) * 100 });
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <Reveal>
          <div className="glass overflow-x-auto rounded-3xl p-5 md:p-8">
            <div className="min-w-[640px]">
              <div className="relative ml-[34%] h-6 border-b border-line text-xs text-faint">
                <span className="absolute left-0 font-mono">Now</span>
                {years.map((y) => (
                  <span key={y.label} className="absolute -translate-x-1/2 font-mono" style={{ left: `${y.left}%` }}>
                    {y.label}
                  </span>
                ))}
              </div>
              <ul className="mt-3 space-y-3">
                {items.map(({ i: it, end }) => {
                  const k = KIND[str(it.data.kind)] ?? KIND.project;
                  const pr = Math.max(0, Math.min(100, num(it.data.progress)));
                  const width = Math.max(4, ((end - start) / span) * 100);
                  return (
                    <li key={it.id} className="grid grid-cols-[34%_1fr] items-center gap-0">
                      <div className="pr-4">
                        <p className="truncate text-sm font-medium text-ink">{str(it.data.title)}</p>
                        <p className="inline-flex items-center gap-1 text-[11px] text-muted">
                          <k.Icon className="size-3" aria-hidden /> {k.label} · {formatMonth(it.data.targetDate) || "TBA"}
                        </p>
                      </div>
                      <div className="relative h-8">
                        {years.map((y) => (
                          <span key={y.label} aria-hidden className="absolute inset-y-0 w-px bg-line" style={{ left: `${y.left}%` }} />
                        ))}
                        <div className="absolute inset-y-1 left-0 overflow-hidden rounded-full border border-accent/40 bg-accent/10" style={{ width: `${width}%` }}>
                          <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${pr}%` }} />
                          <span className="absolute inset-0 flex items-center justify-end pr-3 font-mono text-[10px] text-ink">{pr}%</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Testimonials: Wall of love ───────────── */
export function TestimonialsWall({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
          {section.items.map((it, i) => (
            <Reveal as="li" key={it.id} delay={(i % 3) * 0.07} className="break-inside-avoid">
              <figure className={cn("glass rounded-3xl p-6", i % 4 === 0 && "glow-border")}>
                <Quote className="size-6 text-accent" aria-hidden />
                <blockquote className={cn("mt-3 leading-relaxed text-ink/90", i % 4 === 0 ? "text-lg" : "text-[15px]")}>“{str(it.data.quote)}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {str(it.data.avatar) && <img src={str(it.data.avatar)} alt="" className="size-10 rounded-full object-cover" loading="lazy" />}
                  <span>
                    <span className="block text-sm font-medium text-ink">{str(it.data.name)}</span>
                    <span className="block text-xs text-muted">{str(it.data.role)}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Blog: Featured + list ───────────── */
export function BlogFeatured({ section, index }: SectionProps) {
  const posts = [...section.items].sort((a, b) => str(b.data.date).localeCompare(str(a.data.date)));
  const [top, ...rest] = posts;
  if (!top) return null;
  const href = (it: typeof top) => str(it.data.url) || undefined;
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <a href={href(top)} target="_blank" rel="noopener noreferrer" className="group glass block h-full overflow-hidden rounded-3xl">
              {str(top.data.cover) && <img src={str(top.data.cover)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-105" />}
              <div className="p-6 md:p-8">
                <p className="eyebrow">Latest · {formatMonth(top.data.date)}</p>
                <h3 className="mt-3 font-display text-3xl font-semibold text-ink group-hover:text-gradient">{str(top.data.title)}</h3>
                <p className="mt-3 text-muted">{str(top.data.excerpt)}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-ink">
                  Read article <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </div>
            </a>
          </Reveal>
          <ul className="divide-y divide-line">
            {rest.map((it, i) => (
              <Reveal as="li" key={it.id} delay={i * 0.06}>
                <a href={href(it)} target="_blank" rel="noopener noreferrer" className="group flex gap-4 py-5">
                  {str(it.data.cover) && <img src={str(it.data.cover)} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl object-cover" />}
                  <div>
                    <p className="font-mono text-xs text-faint">{formatMonth(it.data.date)}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-ink group-hover:text-accent-2">{str(it.data.title)}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{str(it.data.excerpt)}</p>
                  </div>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Blog: Minimal list ───────────── */
export function BlogList({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x max-w-4xl">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ul className="divide-y divide-line border-y border-line">
          {section.items.map((it, i) => (
            <Reveal as="li" key={it.id} delay={i * 0.05}>
              <a href={str(it.data.url) || undefined} target="_blank" rel="noopener noreferrer" className="group grid gap-1 py-6 sm:grid-cols-[110px_1fr_auto] sm:items-baseline sm:gap-6">
                <span className="font-mono text-sm text-faint">{formatMonth(it.data.date)}</span>
                <span>
                  <span className="block font-display text-xl font-semibold text-ink transition group-hover:translate-x-1 group-hover:text-gradient">{str(it.data.title)}</span>
                  <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    {arr(it.data.tags).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </span>
                </span>
                <ArrowUpRight className="hidden size-5 text-muted transition group-hover:text-accent-2 sm:block" aria-hidden />
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
