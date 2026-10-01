"use client";
import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/States";
import { arr, cn, str } from "@/lib/utils";
import { slugify } from "@/lib/validation";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import type { SectionProps } from "../types";

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-success/15 text-success" },
  "in-progress": { label: "In progress", cls: "bg-accent-2/15 text-accent-2" },
  planned: { label: "Coming soon", cls: "bg-warn/15 text-warn" },
};

function useProjects(section: SectionProps["section"]) {
  return section.items.map((i) => ({ ...i, slug: slugify(str(i.data.slug) || str(i.data.title)) }));
}
type P = ReturnType<typeof useProjects>[number];

function Badge({ status }: { status: string }) {
  const st = STATUS[status] ?? STATUS.completed;
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur", st.cls)}>{st.label}</span>;
}

function Links({ d }: { d: Record<string, unknown> }) {
  return (
    <>
      {str(d.liveUrl) && (
        <a href={str(d.liveUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
          Live <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
      {str(d.repoUrl) && (
        <a href={str(d.repoUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
          Code <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </>
  );
}

/* ───────────── Netflix rows ───────────── */
function Row({ title, items }: { title: string; items: P[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="group/row relative">
      <div className="container-x mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
        <div className="flex gap-2">
          <button onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="grid size-9 place-items-center rounded-full border border-line hover:border-accent">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="grid size-9 place-items-center rounded-full border border-line hover:border-accent">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <ul ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[max(1rem,calc((100vw-1240px)/2+2.5rem))] px-[max(1rem,calc((100vw-1240px)/2+2.5rem))] py-6">
        {items.map((p) => (
          <li key={p.id} className="w-[78vw] shrink-0 snap-start sm:w-[340px]">
            <Link
              href={`/projects/${p.slug}`}
              className="group relative block overflow-hidden rounded-2xl border border-line bg-bg-2 transition duration-500 hover:z-10 hover:scale-[1.06] hover:border-accent/60 hover:shadow-[0_30px_60px_-15px_rgb(0_0_0/0.9)] focus-visible:scale-[1.04]"
            >
              <img src={str(p.data.cover) || "/demo/project-1.webp"} alt="" loading="lazy" className="aspect-video w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute left-3 top-3">
                <Badge status={str(p.data.status)} />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-lg font-semibold text-white">{str(p.data.title)}</p>
                <p className="mt-1 line-clamp-2 max-h-0 text-sm text-white/80 opacity-0 transition-all duration-500 group-hover:max-h-12 group-hover:opacity-100 group-focus-visible:max-h-12 group-focus-visible:opacity-100">
                  {str(p.data.summary)}
                </p>
                <p className="mt-2 flex flex-wrap gap-1">
                  {arr(p.data.tech).slice(0, 3).map((t) => (
                    <span key={t} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                      {t}
                    </span>
                  ))}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectsRows({ section, index }: SectionProps) {
  const projects = useProjects(section);
  const featured = projects.filter((p) => p.featured);
  const cats = new Map<string, P[]>();
  for (const p of projects) {
    const c = str(p.data.category) || "Projects";
    cats.set(c, [...(cats.get(c) ?? []), p]);
  }
  const hero = featured[0] ?? projects[0];
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10 overflow-hidden">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
      </div>
      {!hero ? (
        <div className="container-x">
          <EmptyState title="Projects coming soon" />
        </div>
      ) : (
        <>
          <Reveal className="container-x mb-12">
            <div className="relative overflow-hidden rounded-3xl border border-line">
              <img src={str(hero.data.cover) || "/demo/project-1.webp"} alt="" className="aspect-[16/9] w-full object-cover md:aspect-[21/9]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-end p-6 md:justify-center md:p-12">
                <p className="eyebrow flex items-center gap-2">
                  <Star className="size-3.5 fill-current text-warn" aria-hidden /> Featured
                </p>
                <h3 className="mt-3 font-display text-3xl font-bold text-white md:text-5xl">{str(hero.data.title)}</h3>
                <p className="mt-3 hidden text-white/80 sm:block">{str(hero.data.summary)}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                  <Link href={`/projects/${hero.slug}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-medium text-black">
                    ▶ Case study
                  </Link>
                  <Links d={hero.data} />
                </div>
              </div>
            </div>
          </Reveal>
          <div className="space-y-6">
            {featured.length > 1 && <Row title="Featured" items={featured} />}
            {[...cats.entries()].map(([c, list]) => (
              <Row key={c} title={c} items={list} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ───────────── Scroll stack ───────────── */
export function ProjectsStack({ section, index }: SectionProps) {
  const projects = useProjects(section);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        {projects.length === 0 ? (
          <EmptyState title="Projects coming soon" />
        ) : (
          <ul className="relative">
            {projects.map((p, i) => (
              <li key={p.id} className="sticky mb-10 md:mb-16" style={{ top: `calc(90px + ${Math.min(i, 6) * 18}px)` }}>
                <article className="glass grid overflow-hidden rounded-[2rem] bg-bg-2/95 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.8)] md:min-h-[420px] md:grid-cols-[1.1fr_1fr]">
                  <Link href={`/projects/${p.slug}`} className="group relative block overflow-hidden" aria-label={`Open case study: ${str(p.data.title)}`}>
                    <img src={str(p.data.cover) || "/demo/project-1.webp"} alt="" loading="lazy" className="size-full max-h-[420px] min-h-[220px] object-cover transition duration-700 group-hover:scale-105" />
                  </Link>
                  <div className="flex flex-col justify-center p-6 md:p-10">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-faint">{String(i + 1).padStart(2, "0")}</span>
                      <Badge status={str(p.data.status)} />
                      {p.featured && <Star className="size-4 fill-current text-warn" aria-label="Featured" />}
                    </div>
                    <h3 className="mt-4 font-display text-3xl font-semibold text-ink md:text-4xl">{str(p.data.title)}</h3>
                    <p className="mt-3 text-muted">{str(p.data.summary)}</p>
                    <ul className="mt-5 flex flex-wrap gap-1.5">
                      {arr(p.data.tech).map((t) => (
                        <li key={t} className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-muted">
                          {t}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex items-center gap-5 text-sm">
                      <Link href={`/projects/${p.slug}`} className="inline-flex items-center gap-1 font-medium text-ink hover:text-accent-2">
                        Case study <ArrowUpRight className="size-4" aria-hidden />
                      </Link>
                      <Links d={p.data} />
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ───────────── Bento showcase ───────────── */
export function ProjectsBento({ section, index }: SectionProps) {
  const projects = [...useProjects(section)].sort((a, b) => Number(b.featured) - Number(a.featured));
  const size = (i: number, f: boolean) => (f && i < 2 ? "md:col-span-2 md:row-span-2" : i % 5 === 3 ? "md:col-span-2" : "");
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        {projects.length === 0 ? (
          <EmptyState title="Projects coming soon" />
        ) : (
          <ul className="grid auto-rows-[220px] grid-flow-dense gap-4 md:grid-cols-4">
            {projects.map((p, i) => (
              <Reveal as="li" key={p.id} delay={Math.min(i, 6) * 0.05} className={cn("min-h-[220px]", size(i, p.featured))}>
                <div className="h-full overflow-hidden rounded-3xl border border-line transition duration-500 hover:border-accent/50 hover:shadow-[0_20px_50px_-15px_var(--accent)]">
                  <Link href={`/projects/${p.slug}`} className="group relative block size-full" aria-label={`Open case study: ${str(p.data.title)}`}>
                    <img src={str(p.data.cover) || "/demo/project-1.webp"} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute left-4 top-4 flex gap-2">
                      <Badge status={str(p.data.status)} />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      {str(p.data.category) && <p className="eyebrow text-[10px]">{str(p.data.category)}</p>}
                      <h3 className="mt-1 font-display text-xl font-semibold text-white md:text-2xl">{str(p.data.title)}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-white/75">{str(p.data.summary)}</p>
                    </div>
                  </Link>
                </div>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
