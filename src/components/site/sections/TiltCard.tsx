"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Perspective tilt + moving glare that follows the pointer (desktop only). */
export function TiltCard({ children, className, max = 10 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * max}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * max}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div className="[perspective:1000px]">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className={cn(
          "group/tilt relative transition-transform duration-300 ease-out [transform:rotateX(var(--rx,0))_rotateY(var(--ry,0))] [transform-style:preserve-3d] motion-reduce:[transform:none]",
          className,
        )}
      >
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
          style={{ background: "radial-gradient(400px circle at var(--gx,50%) var(--gy,50%), rgb(255 255 255 / 0.12), transparent 45%)" }}
        />
      </div>
    </div>
  );
}
