"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Eye, X } from "lucide-react";

/** Shown only to the logged-in owner while previewing an unsaved layout. */
export function PreviewBanner({ items }: { items: { key: string; title: string; layout: string }[] }) {
  useEffect(() => {
    const first = document.getElementById(items[0]?.key);
    if (first && !location.hash) setTimeout(() => first.scrollIntoView({ behavior: "smooth" }), 600);
  }, [items]);
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[80] flex w-[min(94vw,640px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-accent/50 bg-bg-2/95 px-4 py-3 text-sm shadow-2xl backdrop-blur">
      <Eye className="size-4 shrink-0 text-accent-2" aria-hidden />
      <p className="flex-1 text-ink">
        Previewing {items.map((i) => `${i.title} → “${i.layout}”`).join(", ")}.{" "}
        <span className="text-muted">Not saved — only you can see this.</span>
      </p>
      <Link href="/" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted hover:bg-white/5 hover:text-ink" aria-label="Exit preview">
        <X className="size-4" aria-hidden /> Exit
      </Link>
    </div>
  );
}
