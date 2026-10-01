import { Check, GraduationCap, Clock, ExternalLink } from "lucide-react";
import { arr, cn, formatMonth, formatRange, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import type { SectionProps } from "../types";

const ORDER: Record<string, number> = { completed: 0, ongoing: 1, upcoming: 2 };

/* ───────────── Level tracker (stepper) ───────────── */
export function EducationLadder({ section, index }: SectionProps) {
  // Oldest → newest, so the path reads left-to-right like a journey.
  const items = [...section.items].sort(
    (a, b) => (ORDER[str(a.data.status)] ?? 0) - (ORDER[str(b.data.status)] ?? 0) || str(a.data.startDate).localeCompare(str(b.data.startDate)),
  );
  const done = items.filter((i) => str(i.data.status) === "completed").length;
  const ongoing = items.filter((i) => str(i.data.status) === "ongoing").length;
  const pct = items.length ? ((done + ongoing * 0.5) / items.length) * 100 : 0;
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <Reveal>
          <div className="glass mb-10 rounded-3xl p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Journey progress</span>
              <span className="font-mono text-ink">
                {done}/{items.length} completed
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Education progress">
              <div className="h-full rounded-full bg-gradient-to-r from-success via-accent-2 to-accent" style={{ width: `${Math.max(4, pct)}%` }} />
            </div>
          </div>
        </Reveal>
        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {items.map((it, i) => {
            const d = it.data;
            const st = str(d.status) || "completed";
            return (
              <Reveal as="li" key={it.id} delay={i * 0.07} className="relative">
                <article className={cn("glass h-full rounded-3xl p-6", st === "ongoing" && "glow-border", st === "upcoming" && "border-dashed opacity-90")}>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-full text-sm font-bold",
                        st === "completed" && "bg-success/20 text-success",
                        st === "ongoing" && "bg-accent-2/20 text-accent-2 shadow-[0_0_20px_var(--accent-2)]",
                        st === "upcoming" && "bg-warn/15 text-warn",
                      )}
                    >
                      {st === "completed" ? <Check className="size-5" aria-hidden /> : st === "ongoing" ? <GraduationCap className="size-5" aria-hidden /> : <Clock className="size-5" aria-hidden />}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">
                      Step {i + 1} · {st === "completed" ? "Completed" : st === "ongoing" ? "In progress" : "Upcoming"}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-ink">{str(d.degree)}</h3>
                  <p className="mt-1 text-sm text-muted">{str(d.institution)}</p>
                  <p className="mt-3 font-mono text-xs text-faint">{formatRange(d.startDate, d.endDate)}</p>
                  {str(d.grade) && <p className="mt-2 text-sm text-ink/80">🎓 {str(d.grade)}</p>}
                  {arr(d.courses).length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {arr(d.courses).slice(0, 4).map((c) => (
                        <li key={c} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-muted">
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Minimal list ───────────── */
export function EducationList({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x max-w-5xl">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ul className="divide-y divide-line border-y border-line">
          {section.items.map((it, i) => {
            const d = it.data;
            const st = str(d.status);
            return (
              <Reveal as="li" key={it.id} delay={i * 0.05}>
                <div className="group grid gap-2 py-7 transition md:grid-cols-[180px_1fr_auto] md:items-baseline md:gap-8">
                  <p className="font-mono text-sm text-faint">
                    {formatMonth(d.startDate) ? `${formatMonth(d.startDate).split(" ")[1]} — ${formatMonth(d.endDate).split(" ")[1] ?? "now"}` : ""}
                  </p>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-ink transition group-hover:text-gradient">{str(d.degree)}</h3>
                    <p className="mt-1 text-muted">
                      {str(d.institution)}
                      {str(d.grade) && <span className="text-faint"> · {str(d.grade)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {st && st !== "completed" && (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wider", st === "ongoing" ? "bg-accent-2/15 text-accent-2" : "bg-warn/15 text-warn")}>{st}</span>
                    )}
                    {str(d.link) && (
                      <a href={str(d.link)} target="_blank" rel="noopener noreferrer" aria-label={`${str(d.institution)} website`} className="text-muted hover:text-ink">
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
