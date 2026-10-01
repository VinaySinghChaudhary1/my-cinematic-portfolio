"use client";
import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

/** Vertical line that "draws" itself as you scroll through the section. */
export function TimelineLine() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div ref={ref} aria-hidden className="absolute bottom-0 left-[19px] top-0 w-px bg-line md:left-1/2">
      <motion.div style={{ scaleY }} className="h-full w-full origin-top bg-gradient-to-b from-accent-2 via-accent to-transparent shadow-[0_0_12px_var(--accent)]" />
    </div>
  );
}
