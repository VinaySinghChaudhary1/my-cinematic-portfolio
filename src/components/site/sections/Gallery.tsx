"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn, formatMonth, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import type { SectionProps } from "./types";

/** Draggable 3D ring carousel (CSS 3D). Click a photo to open it full-screen. */
function Ring({ items, onOpen }: { items: { id: string; src: string; caption: string }[]; onOpen: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const vel = useRef(0.08);
  const drag = useRef({ on: false, x: 0, moved: 0 });
  const n = items.length;
  const step = 360 / n;
  const [radius, setRadius] = useState(520);

  useEffect(() => {
    const r = () => {
      const w = Math.min(window.innerWidth, 1200);
      const cardW = w < 640 ? 170 : 240;
      setRadius(Math.max(cardW * 1.1, (cardW * 1.15) / (2 * Math.tan(Math.PI / n))));
    };
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, [n]);

  useEffect(() => {
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loop = () => {
      if (!drag.current.on) {
        angle.current += reduce ? 0 : vel.current;
        vel.current += (0.08 - vel.current) * 0.02;
      }
      if (ref.current) ref.current.style.transform = `translateZ(${-radius}px) rotateY(${angle.current}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [radius]);

  const rotateBy = (d: number) => {
    angle.current += d;
  };

  return (
    <div className="relative">
      <div
        className="relative h-[340px] touch-pan-y select-none [perspective:1400px] sm:h-[440px]"
        onPointerDown={(e) => {
          drag.current = { on: true, x: e.clientX, moved: 0 };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current.on) return;
          const dx = e.clientX - drag.current.x;
          drag.current.x = e.clientX;
          drag.current.moved += Math.abs(dx);
          angle.current += dx * 0.25;
          vel.current = dx * 0.25;
        }}
        onPointerUp={() => (drag.current.on = false)}
        onPointerCancel={() => (drag.current.on = false)}
      >
        <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(-6deg)]">
        <div ref={ref} className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => drag.current.moved < 6 && onOpen(i)}
              aria-label={`Open photo: ${it.caption || `photo ${i + 1}`}`}
              className="absolute -left-[85px] -top-[115px] h-[230px] w-[170px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_-15px_rgb(0_0_0/0.9)] [backface-visibility:hidden] sm:-left-[120px] sm:-top-[160px] sm:h-[320px] sm:w-[240px]"
              style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
            >
              <img src={it.src} alt="" draggable={false} className="size-full object-cover" loading="lazy" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-xs text-white/90">{it.caption}</span>
            </button>
          ))}
        </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
      </div>
      <div className="mt-2 flex justify-center gap-3">
        <button onClick={() => rotateBy(step)} aria-label="Rotate left" className="grid size-11 place-items-center rounded-full border border-line hover:border-accent">
          <ChevronLeft className="size-5" />
        </button>
        <button onClick={() => rotateBy(-step)} aria-label="Rotate right" className="grid size-11 place-items-center rounded-full border border-line hover:border-accent">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function Gallery({ section, index }: SectionProps) {
  const items = section.items.map((i) => ({ id: i.id, src: str(i.data.image), caption: str(i.data.caption), album: str(i.data.album), date: str(i.data.date) })).filter((i) => i.src);
  const [open, setOpen] = useState<number | null>(null);
  const layout = str(section.config.layout) || "ring";
  const cur = open !== null ? items[open] : null;

  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % items.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + items.length) % items.length));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, items.length]);

  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10 overflow-hidden">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
      </div>
      {layout === "ring" && items.length >= 3 ? (
        <Reveal>
          <Ring items={items} onOpen={setOpen} />
        </Reveal>
      ) : (
        <div className="container-x">
          <ul className="columns-2 gap-4 md:columns-3 [&>li]:mb-4">
            {items.map((it, i) => (
              <li key={it.id} className="break-inside-avoid">
                <button onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden rounded-2xl" aria-label={`Open photo: ${it.caption || i + 1}`}>
                  <img src={it.src} alt="" loading="lazy" className="w-full transition duration-700 group-hover:scale-105" />
                  {it.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-3 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">{it.caption}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={!!cur} onClose={() => setOpen(null)} title={cur?.caption || "Photo"} wide>
        {cur && (
          <figure className="relative bg-black">
            <img src={cur.src} alt={cur.caption} className="mx-auto max-h-[78dvh] w-auto" />
            <figcaption className="flex items-center justify-between gap-4 px-5 py-3 text-sm text-muted">
              <span>
                {cur.caption}
                {cur.album && <span className="text-faint"> · {cur.album}</span>}
              </span>
              <span className="font-mono text-xs">{formatMonth(cur.date)}</span>
            </figcaption>
            {items.length > 1 && (
              <>
                <button onClick={() => setOpen(((open ?? 0) - 1 + items.length) % items.length)} aria-label="Previous photo" className={cn("absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur")}>
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => setOpen(((open ?? 0) + 1) % items.length)} aria-label="Next photo" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </figure>
        )}
      </Modal>
    </section>
  );
}
