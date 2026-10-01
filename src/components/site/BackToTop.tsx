"use client";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      onClick={() => {
        const lenis = (window as unknown as { __lenis?: { scrollTo: (n: number) => void } }).__lenis;
        if (lenis) lenis.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="inline-flex items-center gap-1 hover:text-ink"
    >
      Back to top <ArrowUp className="size-3.5" aria-hidden />
    </button>
  );
}
