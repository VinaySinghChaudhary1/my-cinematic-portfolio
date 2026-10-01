import { Rocket, GraduationCap, Code2, Briefcase, Heart, Clock } from "lucide-react";
import { cn, formatMonth, num, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import type { SectionProps } from "./types";

const KIND: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  education: { label: "Education", Icon: GraduationCap },
  project: { label: "Project", Icon: Rocket },
  skill: { label: "Skill", Icon: Code2 },
  career: { label: "Career", Icon: Briefcase },
  personal: { label: "Personal", Icon: Heart },
};
const STATUS: Record<string, string> = { planned: "Planned", "in-progress": "In progress", done: "Done" };

export function Roadmap({ section, index }: SectionProps) {
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <ul className="grid gap-5 md:grid-cols-2">
          {section.items.map((it, i) => {
            const d = it.data;
            const k = KIND[str(d.kind)] ?? KIND.project;
            const progress = Math.max(0, Math.min(100, num(d.progress)));
            return (
              <Reveal as="li" key={it.id} delay={(i % 2) * 0.1}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-dashed border-line bg-gradient-to-br from-white/[0.05] to-transparent p-7">
                  <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 font-display text-[7rem] font-bold leading-none text-white/[0.03]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-accent-2">
                      <k.Icon className="size-3.5" aria-hidden /> {k.label}
                    </span>
                    <span className={cn("text-xs uppercase tracking-wider", str(d.status) === "done" ? "text-success" : str(d.status) === "in-progress" ? "text-accent-2" : "text-warn")}>
                      {STATUS[str(d.status)] ?? "Planned"}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold text-ink">{str(d.title)}</h3>
                  {str(d.description) && <p className="mt-2 text-sm leading-relaxed text-muted">{str(d.description)}</p>}
                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs text-faint">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden /> {formatMonth(d.targetDate) || "TBA"}
                      </span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${str(d.title)} progress`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
