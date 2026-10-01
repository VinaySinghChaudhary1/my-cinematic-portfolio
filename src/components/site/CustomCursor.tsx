"use client";
import { useEffect, useRef } from "react";

/** Glowing dot + trailing ring. Desktop (fine pointer) only; expands over interactive elements. */
export function CustomCursor({ enabled }: { enabled: boolean }) {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    document.documentElement.classList.add("has-custom-cursor");
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0, hover = false, visible = false;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      hover = !!t?.closest("a,button,[data-cursor=hover],input,textarea,select,label");
      if (!visible) {
        visible = true;
        rx = x; ry = y;
      }
    };
    const leave = () => (visible = false);
    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        dot.current.style.opacity = visible ? "1" : "0";
      }
      if (ring.current) {
        const s = hover ? 1.9 : 1;
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${s})`;
        ring.current.style.opacity = visible ? "1" : "0";
        ring.current.style.background = hover ? "color-mix(in oklab, var(--accent) 18%, transparent)" : "transparent";
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div ref={ring} className="fixed left-0 top-0 size-9 rounded-full border border-accent-2/60 opacity-0 transition-[background,opacity] duration-200 will-change-transform" />
      <div ref={dot} className="fixed left-0 top-0 size-1.5 rounded-full bg-ink opacity-0 shadow-[0_0_14px_3px_var(--accent-2)] will-change-transform" />
    </div>
  );
}
