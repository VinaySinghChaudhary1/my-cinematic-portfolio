"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight, Download, MapPin, ArrowDown } from "lucide-react";
import { SocialLinks } from "@/components/ui/SocialIcon";
import { arr, str } from "@/lib/utils";
import { Typing } from "../Hero";
import type { SectionProps } from "../types";

function useHeroData({ section, settings }: SectionProps) {
  const c = section.config;
  const p = settings.profile;
  const images = arr(c.portraitImages);
  return {
    c,
    p,
    photo: images[0] || p.avatar || "/demo/portrait-front.webp",
    roles: arr(c.roles),
    cta: { label: str(c.primaryCtaLabel) || "View my work", href: str(c.primaryCtaHref) || "#projects" },
    resume: c.showResumeButton !== false ? p.resume : "",
  };
}

function Actions({ cta, resume, socials, center }: { cta: { label: string; href: string }; resume: string; socials: Record<string, string>; center?: boolean }) {
  return (
    <div className={center ? "flex flex-col items-center" : ""}>
      <div className={`flex flex-wrap items-center gap-3 ${center ? "justify-center" : ""}`}>
        <a
          href={cta.href}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3.5 font-medium text-white shadow-[0_10px_40px_-10px_var(--accent)] transition hover:scale-[1.03]"
        >
          {cta.label}
          <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </a>
        {resume && (
          <a href={resume} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-line bg-glass px-6 py-3.5 font-medium text-ink backdrop-blur transition hover:border-accent-2">
            <Download className="size-4" aria-hidden /> Résumé
          </a>
        )}
      </div>
      <SocialLinks socials={socials} className={`mt-6 ${center ? "justify-center" : ""}`} />
    </div>
  );
}

/* ───────────── Terminal boot ───────────── */
export function HeroTerminal(props: SectionProps) {
  const { section, settings } = props;
  const { p, roles, cta, resume, c } = useHeroData(props);
  const reduce = useReducedMotion();
  const script = [
    { cmd: "whoami", out: p.name },
    { cmd: "cat headline.txt", out: p.headline || "Student developer" },
    { cmd: "ls ./roles", out: roles.join("  ·  ") || "developer" },
    { cmd: "./launch-portfolio.sh", out: "✔ ready — welcome!" },
  ];
  const full = script.flatMap((s) => [`$ ${s.cmd}`, s.out]);
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduce) {
      setLines(full);
      setDone(true);
      return;
    }
    let li = 0;
    let ch = 0;
    const out: string[] = [];
    const tick = () => {
      if (li >= full.length) {
        setDone(true);
        return;
      }
      const line = full[li];
      const isCmd = line.startsWith("$ ");
      if (!isCmd) {
        out[li] = line;
        li++;
        ch = 0;
        setLines([...out]);
        t = setTimeout(tick, 260);
        return;
      }
      ch++;
      out[li] = line.slice(0, ch);
      setLines([...out]);
      if (ch >= line.length) {
        li++;
        ch = 0;
        t = setTimeout(tick, 220);
      } else t = setTimeout(tick, 38);
    };
    let t = setTimeout(tick, 500);
    const safety = setTimeout(() => {
      setLines(full);
      setDone(true);
    }, 9000);
    return () => {
      clearTimeout(t);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, full.join("|")]);

  return (
    <section id={section.key} aria-label="Introduction" className="relative z-10 flex min-h-[100svh] items-center overflow-hidden pt-28 pb-16">
      <div className="pointer-events-none absolute left-1/4 top-1/3 size-[480px] rounded-full bg-accent/15 blur-[140px]" />
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div className="glass glow-border overflow-hidden rounded-2xl font-mono text-[13px] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] sm:text-sm" aria-hidden>
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs text-faint">~/portfolio — zsh</span>
          </div>
          <div className="min-h-[300px] space-y-1.5 p-5 sm:p-6">
            {lines.map((l, i) =>
              l?.startsWith("$") ? (
                <p key={i} className="text-ink">
                  <span className="text-success">➜</span> <span className="text-accent-2">~</span> {l.slice(2)}
                  {!done && i === lines.length - 1 && <span className="caret ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-ink/80" />}
                </p>
              ) : (
                <p key={i} className="pl-4 text-muted">
                  {l}
                </p>
              ),
            )}
            {done && (
              <p className="text-ink">
                <span className="text-success">➜</span> <span className="text-accent-2">~</span> <span className="caret inline-block h-4 w-2 translate-y-0.5 bg-ink/80" />
              </p>
            )}
          </div>
        </div>

        <motion.div initial={false} animate={{ opacity: done ? 1 : 0.35, y: done ? 0 : 12 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <p className="eyebrow">{str(c.greeting) || "Hello, I'm"}</p>
          <h1 className="mt-4 font-display text-[clamp(2.8rem,7vw,6rem)] font-bold leading-[0.95] tracking-[-0.04em] text-gradient">{p.name}</h1>
          <p className="mt-5 font-display text-xl text-ink/90 sm:text-2xl">
            <Typing words={roles} />
          </p>
          {p.tagline && <p className="mt-4 max-w-xl text-muted sm:text-lg">{p.tagline}</p>}
          <div className="mt-8">
            <Actions cta={cta} resume={resume} socials={settings.socials} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────── Split parallax ───────────── */
export function HeroSplit(props: SectionProps) {
  const { section, settings } = props;
  const { p, roles, cta, resume, c, photo } = useHeroData(props);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const glowX = useTransform(sx, (v) => v * 40);
  const glowY = useTransform(sy, (v) => v * 40);
  const chips = roles.slice(0, 4);
  const pos = ["-left-4 top-[12%]", "-right-6 top-[30%]", "-left-8 bottom-[22%]", "-right-2 bottom-[8%]"];

  return (
    <section
      ref={ref}
      id={section.key}
      aria-label="Introduction"
      className="relative z-10 flex min-h-[100svh] items-center overflow-hidden pt-28 pb-16"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
    >
      <div className="container-x grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div style={{ y: yImg }} className="relative mx-auto w-full max-w-[460px]">
          <motion.div style={{ x: glowX, y: glowY }} className="absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-accent/40 via-transparent to-accent-2/40 blur-3xl" />
          <motion.div
            initial={reduce ? false : { clipPath: "inset(100% 0 0 0)" }}
            animate={{ clipPath: "inset(0% 0 0 0)" }}
            transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
            className="glow-border relative overflow-hidden rounded-[2.5rem]"
          >
            <img src={photo} alt={`Portrait of ${p.name}`} className="aspect-[4/5] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
          </motion.div>
          {chips.map((r, i) => (
            <motion.span
              key={r}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + i * 0.15 }}
              className={`glass absolute ${pos[i]} hidden rounded-full px-4 py-2 text-sm text-ink shadow-xl sm:block`}
              style={{ animation: reduce ? undefined : `float-y ${4 + i}s ease-in-out infinite` }}
            >
              {r}
            </motion.span>
          ))}
        </motion.div>

        <motion.div style={{ y: yText }}>
          <motion.p initial={reduce ? false : { opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="eyebrow">
            {str(c.greeting) || "Hello, I'm"}
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 font-display text-[clamp(3rem,8vw,7rem)] font-bold leading-[0.92] tracking-[-0.045em] text-ink"
          >
            {p.name.split(" ").map((w, i, a) => (
              <span key={i} className={i === a.length - 1 ? "text-gradient" : ""}>
                {w}
                {i < a.length - 1 ? " " : ""}
              </span>
            ))}
          </motion.h1>
          <p className="mt-6 font-display text-xl text-ink/90 sm:text-2xl">
            <Typing words={roles} />
          </p>
          {p.tagline && <p className="mt-4 max-w-xl text-muted sm:text-lg">{p.tagline}</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {p.headline && <span>{p.headline}</span>}
            {p.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-accent-2" aria-hidden /> {p.location}
              </span>
            )}
          </div>
          <div className="mt-8">
            <Actions cta={cta} resume={resume} socials={settings.socials} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────── Cinematic letterbox ───────────── */
export function HeroCinematic(props: SectionProps) {
  const { section, settings } = props;
  const { p, roles, cta, resume, c, photo } = useHeroData(props);
  const reduce = useReducedMotion();
  return (
    <section id={section.key} aria-label="Introduction" className="relative z-10 flex min-h-[100svh] items-center justify-center overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        initial={reduce ? false : { scale: 1.25, opacity: 0 }}
        animate={{ scale: 1.05, opacity: 1 }}
        transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={photo} alt="" className="size-full object-cover object-top opacity-40 blur-[2px] grayscale-[30%]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,var(--color-bg)_75%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/30 to-bg" />
      </motion.div>
      {/* letterbox bars */}
      <motion.div aria-hidden className="absolute inset-x-0 top-0 z-10 h-[9vh] bg-black" initial={reduce ? false : { y: "-100%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }} />
      <motion.div aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-[9vh] bg-black" initial={reduce ? false : { y: "100%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }} />

      <div className="container-x relative z-20 py-32 text-center">
        <motion.p initial={reduce ? false : { opacity: 0, letterSpacing: "0.8em" }} animate={{ opacity: 1, letterSpacing: "0.32em" }} transition={{ duration: 1.6, delay: 0.6 }} className="font-mono text-xs uppercase text-accent-2 sm:text-sm">
          {p.headline || str(c.greeting) || "Presenting"}
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, scale: 1.12, filter: "blur(14px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.6, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 font-display text-[clamp(3.2rem,12vw,10rem)] font-bold uppercase leading-[0.85] tracking-[-0.04em] text-gradient"
        >
          {p.name}
        </motion.h1>
        <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }}>
          <p className="mt-8 font-display text-xl text-ink/90 sm:text-2xl">
            <Typing words={roles} />
          </p>
          {p.tagline && <p className="mx-auto mt-4 max-w-2xl text-muted sm:text-lg">{p.tagline}</p>}
          <div className="mt-10">
            <Actions cta={cta} resume={resume} socials={settings.socials} center />
          </div>
        </motion.div>
      </div>
      {c.showScrollHint !== false && (
        <a href="#main-content" aria-label="Scroll down" className="absolute bottom-[11vh] left-1/2 z-20 hidden -translate-x-1/2 text-faint md:block">
          <ArrowDown className="size-5 animate-bounce" aria-hidden />
        </a>
      )}
    </section>
  );
}
