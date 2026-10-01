"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search, ExternalLink, Star } from "lucide-react";
import { NoResults, EmptyState } from "@/components/ui/States";
import { arr, cn, num, str } from "@/lib/utils";
import { slugify } from "@/lib/validation";
import { SectionHeading } from "../SectionHeading";
import { TiltCard } from "./TiltCard";
import type { SectionProps } from "./types";

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-success/15 text-success" },
  "in-progress": { label: "In progress", cls: "bg-accent-2/15 text-accent-2" },
  planned: { label: "Coming soon", cls: "bg-warn/15 text-warn" },
};

export function Projects({ section, index }: SectionProps) {
  const c = section.config;
  const projects = section.items.map((i) => ({ ...i, slug: slugify(str(i.data.slug) || str(i.data.title)) }));
  const categories = Array.from(new Set(projects.map((p) => str(p.data.category)).filter(Boolean)));
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(num(c.initialCount, 6) || 6);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (cat !== "All" && str(p.data.category) !== cat) return false;
      if (!needle) return true;
      const hay = [p.data.title, p.data.summary, p.data.category, ...arr(p.data.tech)].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [projects, cat, q]);

  const shown = filtered.slice(0, limit);
  const reset = () => {
    setQ("");
    setCat("All");
  };

  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />

        {projects.length === 0 ? (
          <EmptyState title="Projects coming soon" text="New work is being prepared. Check back shortly." />
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {c.showFilters !== false && categories.length > 1 && (
                <div role="group" aria-label="Filter projects by category" className="flex flex-wrap gap-2">
                  {["All", ...categories].map((x) => (
                    <button
                      key={x}
                      aria-pressed={cat === x}
                      onClick={() => setCat(x)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition",
                        cat === x ? "border-transparent bg-gradient-to-r from-accent to-accent-2 text-white" : "border-line text-muted hover:text-ink",
                      )}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              )}
              {c.showSearch !== false && (
                <label className="glass flex w-full items-center gap-2 rounded-full px-4 py-2.5 md:w-72">
                  <Search className="size-4 text-faint" aria-hidden />
                  <span className="sr-only">Search projects</span>
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search projects or tech…"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
                  />
                </label>
              )}
            </div>

            <p className="sr-only" aria-live="polite">
              {filtered.length} project{filtered.length === 1 ? "" : "s"} shown
            </p>

            {filtered.length === 0 ? (
              <NoResults query={q || cat} onReset={reset} />
            ) : (
              <motion.ul layout className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {shown.map((p, i) => {
                    const d = p.data;
                    const st = STATUS[str(d.status)] ?? STATUS.completed;
                    const big = p.featured && cat === "All" && !q && i === 0;
                    return (
                      <motion.li
                        layout
                        key={p.id}
                        initial={{ opacity: 0, y: 30, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.05 }}
                        className={cn(big && "md:col-span-2")}
                      >
                        <TiltCard max={6} className="glass glow-border h-full overflow-hidden rounded-3xl">
                          <article className="flex h-full flex-col">
                            <Link href={`/projects/${p.slug}`} className="group relative block overflow-hidden" aria-label={`Open case study: ${str(d.title)}`}>
                              <img
                                src={str(d.cover) || "/demo/project-1.webp"}
                                alt=""
                                loading="lazy"
                                className={cn("w-full object-cover transition duration-700 group-hover:scale-105", big ? "aspect-[16/8]" : "aspect-[16/10]")}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
                              <span className={cn("absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider backdrop-blur", st.cls)}>
                                {st.label}
                              </span>
                              {p.featured && (
                                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-[11px] text-warn backdrop-blur">
                                  <Star className="size-3 fill-current" aria-hidden /> Featured
                                </span>
                              )}
                            </Link>
                            <div className="flex flex-1 flex-col p-6">
                              {str(d.category) && <p className="eyebrow text-[10px]">{str(d.category)}</p>}
                              <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                                <Link href={`/projects/${p.slug}`} className="hover:text-gradient">
                                  {str(d.title)}
                                </Link>
                              </h3>
                              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{str(d.summary)}</p>
                              {arr(d.tech).length > 0 && (
                                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tech stack">
                                  {arr(d.tech).slice(0, 5).map((t) => (
                                    <li key={t} className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-muted">
                                      {t}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-5 flex items-center gap-4 text-sm">
                                <Link href={`/projects/${p.slug}`} className="inline-flex items-center gap-1 font-medium text-ink hover:text-accent-2">
                                  Case study <ArrowUpRight className="size-4" aria-hidden />
                                </Link>
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
                              </div>
                            </div>
                          </article>
                        </TiltCard>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            )}

            {filtered.length > limit && (
              <div className="mt-10 text-center">
                <button onClick={() => setLimit((l) => l + 6)} className="rounded-full border border-line px-6 py-3 text-sm text-ink transition hover:border-accent">
                  Show more ({filtered.length - limit} more)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
