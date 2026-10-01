"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Download, MapPin } from "lucide-react";
import { SocialLinks } from "@/components/ui/SocialIcon";
import { arr, str } from "@/lib/utils";
import type { SectionProps } from "./types";

const Portrait3D = dynamic(() => import("./HeroPortrait3D"), {
  ssr: false,
  loading: () => <div className="skeleton mx-auto aspect-[4/5] w-[70%]" aria-hidden />,
});

export function Typing({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!words.length) return;
    if (reduce) {
      setText(words[0]);
      return;
    }
    const word = words[i % words.length];
    const speed = del ? 35 : 75;
    const t = setTimeout(() => {
      if (!del && text === word) return setTimeout(() => setDel(true), 1400);
      if (del && text === "") {
        setDel(false);
        setI((n) => n + 1);
        return;
      }
      setText(del ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [text, del, i, words, reduce]);
  if (!words.length) return null;
  return (
    <span aria-live="off">
      <span className="sr-only">{words.join(", ")}</span>
      <span aria-hidden className="text-gradient">{text}</span>
      <span aria-hidden className="caret ml-0.5 inline-block h-[1em] w-[3px] translate-y-[0.15em] bg-accent-2" />
    </span>
  );
}

export function Hero({ section, settings }: SectionProps) {
  const c = section.config;
  const p = settings.profile;
  const reduce = useReducedMotion();
  const images = arr(c.portraitImages);
  const front = images[0] || p.avatar || "/demo/portrait-front.webp";
  const back = images[1] || "";
  const nameParts = p.name.split(" ");
  const ctaHref = str(c.primaryCtaHref) || "#projects";

  const letter = {
    hidden: { y: "110%", opacity: 0 },
    show: (i: number) => ({ y: 0, opacity: 1, transition: { delay: 0.25 + i * 0.12, duration: 1.1, ease: [0.16, 1, 0.3, 1] as const } }),
  };

  return (
    <section id={section.key} aria-label="Introduction" className="relative z-10 flex min-h-[100svh] items-center overflow-hidden pt-28 pb-16">
      <div className="pointer-events-none absolute -left-40 top-1/4 size-[520px] rounded-full bg-accent/20 blur-[140px]" />
      <div className="pointer-events-none absolute -right-20 bottom-10 size-[420px] rounded-full bg-accent-2/15 blur-[140px]" />

      <div className="container-x grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="eyebrow flex items-center gap-3"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {str(c.greeting) || "Hello, I'm"}
          </motion.p>

          <h1 className="mt-5 font-display text-[clamp(3rem,9vw,7.5rem)] font-bold leading-[0.95] tracking-[-0.04em]">
            {nameParts.map((word, wi) => (
              <span key={wi} className="mr-[0.22em] inline-block overflow-hidden pb-[0.1em] align-bottom">
                <motion.span
                  custom={wi}
                  variants={letter}
                  initial={reduce ? false : "hidden"}
                  animate="show"
                  className={`inline-block ${wi === nameParts.length - 1 ? "text-gradient" : "text-ink"}`}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-6 space-y-5"
          >
            <p className="font-display text-xl text-ink/90 sm:text-2xl md:text-3xl">
              <Typing words={arr(c.roles)} />
            </p>
            {p.tagline && <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">{p.tagline}</p>}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              {p.headline && <span>{p.headline}</span>}
              {p.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-accent-2" aria-hidden /> {p.location}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={ctaHref}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3.5 font-medium text-white shadow-[0_10px_40px_-10px_var(--accent)] transition hover:scale-[1.03]"
              >
                {str(c.primaryCtaLabel) || "View my work"}
                <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </a>
              {c.showResumeButton !== false && p.resume && (
                <a
                  href={p.resume}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-glass px-6 py-3.5 font-medium text-ink backdrop-blur transition hover:border-accent-2"
                >
                  <Download className="size-4" aria-hidden /> Résumé
                </a>
              )}
            </div>
            <SocialLinks socials={settings.socials} className="pt-2" />
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-[4/5] w-full max-w-[480px]"
        >
          {c.show3D !== false ? (
            <>
              <Portrait3D front={front} back={back} accent={settings.appearance.accent} accent2={settings.appearance.accent2} alt={`Portrait of ${p.name}`} />
              <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-faint">
                drag to spin
              </p>
            </>
          ) : (
            <div className="glow-border relative size-full overflow-hidden rounded-[2rem]">
              <img src={front} alt={`Portrait of ${p.name}`} className="size-full object-cover" />
            </div>
          )}
        </motion.div>
      </div>

      {c.showScrollHint !== false && (
        <a href="#main-content" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-faint md:flex" aria-label="Scroll down">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <ArrowDown className="size-4 animate-bounce" aria-hidden />
        </a>
      )}
    </section>
  );
}
