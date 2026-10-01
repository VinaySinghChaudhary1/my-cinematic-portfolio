"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Cinematic intro: counter + name reveal + letterbox bars. Shown once per browser session. */
export function Preloader({ name, enabled }: { name: string; enabled: boolean }) {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("pf_intro") === "1";
    } catch {}
    if (seen) return;
    // Opened in a background tab: browsers pause animations there, so skip the intro.
    if (document.visibilityState === "hidden") return;
    // Mark as seen only when the intro actually finishes. (Marking it at start broke React
    // Strict Mode in development: the effect re-ran, saw "seen", and the overlay never closed.)
    const finish = () => {
      setShow(false);
      try {
        sessionStorage.setItem("pf_intro", "1");
      } catch {}
    };
    setShow(true);
    const start = performance.now();
    const dur = 1700;
    let raf = 0;
    let done: ReturnType<typeof setTimeout> | undefined;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else done = setTimeout(finish, 450);
    };
    raf = requestAnimationFrame(step);
    const safety = setTimeout(finish, 4000); // never block the site, even if animation frames are throttled
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      if (done) clearTimeout(done);
      setShow(false);
    };
  }, [enabled]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-bg"
          exit={{ clipPath: "inset(50% 0 50% 0)" }}
          initial={{ clipPath: "inset(0% 0 0% 0)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklab,var(--accent)_25%,transparent),transparent_60%)]" />
          <div className="relative text-center">
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="font-display text-5xl font-bold tracking-tight text-gradient sm:text-7xl"
              >
                {name}
              </motion.h1>
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="eyebrow mt-4">
              Portfolio · Loading experience
            </motion.p>
          </div>
          <div className="absolute bottom-8 left-1/2 w-[min(80vw,420px)] -translate-x-1/2">
            <div className="h-px w-full bg-line">
              <div className="h-px bg-gradient-to-r from-accent to-accent-2" style={{ width: `${count}%` }} />
            </div>
            <p className="mt-3 text-right font-mono text-xs text-muted tabular-nums">{String(count).padStart(3, "0")}%</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
