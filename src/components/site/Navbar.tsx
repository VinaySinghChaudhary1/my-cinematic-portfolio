"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLink {
  key: string;
  title: string;
}

export function Navbar({ initials, name, links, resume, home = true }: { initials: string; name: string; links: NavLink[]; resume?: string; home?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = links.slice(0, 6);
  const more = links.slice(6);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!home) return;
    const els = links.map((l) => document.getElementById(l.key)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [links, home]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const href = (k: string) => (home ? `#${k}` : `/#${k}`);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", scrolled ? "py-2" : "py-4")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className={cn(
          "container-x flex items-center justify-between gap-4 rounded-full transition-all duration-500",
          scrolled && "glass mx-auto max-w-[1180px] py-2 shadow-[0_10px_40px_-10px_rgb(0_0_0/0.6)]",
        )}
      >
        <Link href="/" className="group flex items-center gap-2" aria-label={`${name} — home`}>
          <span className="relative grid size-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 font-display text-sm font-bold text-white shadow-[0_0_24px_-4px_var(--accent)]">
            {initials}
          </span>
          <span className="hidden whitespace-nowrap font-display text-sm font-medium text-ink/90 sm:block">{name}</span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {primary.map((l) => (
            <li key={l.key}>
              <a
                href={href(l.key)}
                aria-current={active === l.key ? "true" : undefined}
                className={cn(
                  "relative whitespace-nowrap rounded-full px-3 py-2 text-sm text-muted transition hover:text-ink",
                  active === l.key && "bg-white/[0.07] text-ink",
                )}
              >
                {l.title}
              </a>
            </li>
          ))}
          {more.length > 0 && (
            <li className="relative" onMouseLeave={() => setMoreOpen(false)}>
              <button
                aria-expanded={moreOpen}
                aria-haspopup="true"
                onClick={() => setMoreOpen((o) => !o)}
                onMouseEnter={() => setMoreOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-muted hover:text-ink",
                  more.some((m) => m.key === active) && "bg-white/[0.07] text-ink",
                )}
              >
                More <ChevronDown className={cn("size-3.5 transition", moreOpen && "rotate-180")} aria-hidden />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full pt-2">
                  <ul className="glass min-w-48 rounded-2xl bg-bg-2/90 p-2 shadow-2xl">
                    {more.map((l) => (
                      <li key={l.key}>
                        <a
                          href={href(l.key)}
                          onClick={() => setMoreOpen(false)}
                          className={cn("block whitespace-nowrap rounded-xl px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ink", active === l.key && "text-ink")}
                        >
                          {l.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )}
        </ul>

        <div className="flex items-center gap-2">
          {resume && (
            <a
              href={resume}
              target="_blank"
              rel="noopener"
              className="hidden items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg transition hover:shadow-[0_0_30px_-4px_var(--accent-2)] sm:flex"
            >
              <Download className="size-4" aria-hidden /> Résumé
            </a>
          )}
          <button
            className="grid size-11 place-items-center rounded-full border border-line lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        hidden={!open}
        className="container-x mt-2 lg:hidden"
      >
        <ul className="glass grid gap-1 rounded-3xl p-3">
          {links.map((l) => (
            <li key={l.key}>
              <a href={href(l.key)} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-ink/90 hover:bg-white/5">
                {l.title}
              </a>
            </li>
          ))}
          {resume && (
            <li>
              <a href={resume} target="_blank" rel="noopener" className="mt-1 flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 font-medium text-bg">
                <Download className="size-4" /> Download résumé
              </a>
            </li>
          )}
        </ul>
      </div>
    </header>
  );
}
