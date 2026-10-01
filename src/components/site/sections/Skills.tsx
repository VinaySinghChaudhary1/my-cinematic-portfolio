"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn, num, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import type { SectionProps } from "./types";

/** 3D tag sphere (pure CSS transforms — light, accessible, no WebGL needed). Drag or hover to steer. */
function SkillSphere({ skills }: { skills: { name: string; icon: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const tags = useRef<(HTMLLIElement | null)[]>([]);
  const reduce = useReducedMotion();
  const points = useMemo(() => {
    const n = skills.length;
    return skills.map((_, i) => {
      const phi = Math.acos(-1 + (2 * i + 1) / n);
      const theta = Math.sqrt(n * Math.PI) * phi;
      return [Math.cos(theta) * Math.sin(phi), Math.sin(theta) * Math.sin(phi), Math.cos(phi)] as [number, number, number];
    });
  }, [skills]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ax = 0.002, ay = 0.004, raf = 0;
    const rot = { x: 0, y: 0 };
    let dragging = false, lx = 0, ly = 0;
    const render = () => {
      const R = el.clientWidth / 2.4;
      const cx = Math.cos(rot.x), sx = Math.sin(rot.x), cy = Math.cos(rot.y), sy = Math.sin(rot.y);
      points.forEach(([x, y, z], i) => {
        const y1 = y * cx - z * sx;
        const z1 = y * sx + z * cx;
        const x2 = x * cy + z1 * sy;
        const z2 = -x * sy + z1 * cy;
        const t = tags.current[i];
        if (!t) return;
        const s = (z2 + 2) / 3;
        t.style.transform = `translate(-50%, -50%) translate3d(${x2 * R}px, ${y1 * R}px, 0) scale(${s})`;
        t.style.opacity = String(0.25 + ((z2 + 1) / 2) * 0.75);
        t.style.zIndex = String(Math.round(s * 100));
      });
    };
    const loop = () => {
      if (!dragging) {
        rot.x += ax;
        rot.y += ay;
      }
      render();
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (dragging) {
        rot.y += (e.clientX - lx) * 0.008;
        rot.x -= (e.clientY - ly) * 0.008;
        lx = e.clientX;
        ly = e.clientY;
        return;
      }
      ay = ((e.clientX - r.left) / r.width - 0.5) * 0.02;
      ax = -((e.clientY - r.top) / r.height - 0.5) * 0.02;
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => (dragging = false);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    if (reduce) render();
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [points, reduce]);

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[520px] touch-pan-y select-none" aria-hidden>
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_30%,transparent),transparent_65%)] blur-2xl" />
      <div className="absolute inset-[18%] rounded-full border border-line" />
      <ul>
        {skills.map((s, i) => (
          <li
            key={s.name}
            ref={(n) => {
              tags.current[i] = n;
            }}
            className="absolute left-1/2 top-1/2 whitespace-nowrap rounded-full border border-line bg-bg-2/80 px-3 py-1.5 font-display text-sm text-ink shadow-[0_0_20px_-6px_var(--accent)] backdrop-blur will-change-transform"
          >
            {s.icon && <span className="mr-1.5">{s.icon}</span>}
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Skills({ section, index }: SectionProps) {
  const skills = section.items.map((i) => ({
    name: str(i.data.name),
    category: str(i.data.category) || "Other",
    level: num(i.data.level, 0),
    icon: str(i.data.icon),
    years: num(i.data.years, 0),
  }));
  const categories = Array.from(new Set(skills.map((s) => s.category)));
  const [cat, setCat] = useState("All");
  const shown = cat === "All" ? skills : skills.filter((s) => s.category === cat);
  const showSphere = section.config.showSphere !== false;
  const showBars = section.config.showBars !== false;

  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <div className={cn("grid items-start gap-12", showSphere && showBars && "lg:grid-cols-2")}>
          {showSphere && (
            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <SkillSphere skills={skills} />
              <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-faint">drag the sphere</p>
            </Reveal>
          )}
          {showBars && (
            <div>
              <div role="tablist" aria-label="Skill categories" className="mb-6 flex flex-wrap gap-2">
                {["All", ...categories].map((c) => (
                  <button
                    key={c}
                    role="tab"
                    aria-selected={cat === c}
                    onClick={() => setCat(c)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition",
                      cat === c ? "border-transparent bg-ink text-bg" : "border-line text-muted hover:text-ink",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <ul className="grid gap-4 sm:grid-cols-2" role="tabpanel">
                {shown.map((s, i) => (
                  <motion.li
                    key={`${cat}-${s.name}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-sm" aria-hidden>
                          {s.icon || s.name[0]}
                        </span>
                        {s.name}
                      </span>
                      <span className="font-mono text-xs text-muted">{s.level}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5" role="meter" aria-valuenow={s.level} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name} proficiency`}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${s.level}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                      />
                    </div>
                    {s.years > 0 && <p className="mt-2 text-xs text-faint">{s.years}+ yr{s.years > 1 ? "s" : ""}</p>}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
