"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Copy, Check, Mail, MapPin, Clock, ArrowUpRight } from "lucide-react";
import { SocialLinks } from "@/components/ui/SocialIcon";
import { cn, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import { ContactForm } from "../ContactForm";
import type { SectionProps } from "../types";

/* ───────────── Testimonials: Spotlight slider ───────────── */
export function TestimonialsSpotlight({ section, index }: SectionProps) {
  const items = section.items;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const n = items.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    if (paused || reduce || n < 2) return;
    const t = setInterval(() => go(1), 7000);
    return () => clearInterval(t);
  }, [paused, reduce, n, go]);
  const cur = items[i];
  if (!cur) return null;
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <div
          className="glass glow-border relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] p-8 md:p-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          role="group"
          aria-roledescription="carousel"
          aria-label="Testimonials"
        >
          <Quote aria-hidden className="absolute -right-4 -top-6 size-40 text-white/[0.04]" />
          <AnimatePresence mode="wait">
            <motion.figure
              key={cur.id}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              aria-live="polite"
            >
              <blockquote className="font-display text-2xl leading-snug text-ink md:text-3xl">“{str(cur.data.quote)}”</blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                {str(cur.data.avatar) && <img src={str(cur.data.avatar)} alt="" className="size-14 rounded-full border border-line object-cover" />}
                <span>
                  <span className="block font-medium text-ink">{str(cur.data.name)}</span>
                  <span className="block text-sm text-muted">{str(cur.data.role)}</span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
          {n > 1 && (
            <div className="mt-10 flex items-center justify-between">
              <ul className="flex gap-1.5">
                {items.map((it, k) => (
                  <li key={it.id}>
                    <button onClick={() => setI(k)} aria-label={`Show testimonial ${k + 1}`} aria-current={k === i} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-8 bg-accent-2" : "w-3 bg-white/20 hover:bg-white/40")} />
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button onClick={() => go(-1)} aria-label="Previous testimonial" className="grid size-11 place-items-center rounded-full border border-line hover:border-accent">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => go(1)} aria-label="Next testimonial" className="grid size-11 place-items-center rounded-full border border-line hover:border-accent">
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CopyEmail({ email, big }: { email: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("flex flex-wrap items-center gap-3", big && "justify-center")}>
      <a href={`mailto:${email}`} className={cn("font-display font-semibold text-ink transition hover:text-gradient", big ? "break-all text-[clamp(1.8rem,6vw,4.5rem)] leading-tight" : "text-lg")}>
        {email}
      </a>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard blocked — the mailto link still works */
          }
        }}
        aria-label="Copy email address"
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-ink"
      >
        {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}

/* ───────────── Contact: Big email ───────────── */
export function ContactMinimal({ section, settings, index }: SectionProps) {
  const c = section.config;
  const email = settings.profile.email;
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--accent)_25%,transparent),transparent_70%)]" />
      <div className="container-x relative text-center">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={str(c.heading) || section.subtitle} />
        <Reveal>
          {str(c.availability) && (
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
              <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden /> {str(c.availability)}
            </p>
          )}
          {str(c.text) && <p className="mx-auto max-w-2xl text-lg text-muted">{str(c.text)}</p>}
          <div className="mt-10">{email ? <CopyEmail email={email} big /> : <p className="text-muted">Find me on the links below.</p>}</div>
          <SocialLinks socials={settings.socials} className="mt-10 justify-center" />
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Contact: Cards ───────────── */
export function ContactCards({ section, settings, index }: SectionProps) {
  const c = section.config;
  const p = settings.profile;
  const [time, setTime] = useState("");
  useEffect(() => {
    const f = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    f();
    const t = setInterval(f, 30_000);
    return () => clearInterval(t);
  }, []);
  const profiles = Object.entries(settings.socials).filter(([, v]) => v);
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={str(c.heading) || section.subtitle} />
        {str(c.text) && <p className="-mt-6 mb-10 max-w-2xl text-lg text-muted">{str(c.text)}</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.showEmail !== false && p.email && (
            <Reveal as="li" className="glass glow-border rounded-3xl p-6 sm:col-span-2">
              <Mail className="size-6 text-accent-2" aria-hidden />
              <p className="mt-6 text-xs uppercase tracking-wider text-muted">Email</p>
              <CopyEmail email={p.email} />
            </Reveal>
          )}
          {p.location && (
            <Reveal as="li" delay={0.05} className="glass rounded-3xl p-6">
              <MapPin className="size-6 text-accent-2" aria-hidden />
              <p className="mt-6 text-xs uppercase tracking-wider text-muted">Location</p>
              <p className="font-display text-lg text-ink">{p.location}</p>
            </Reveal>
          )}
          <Reveal as="li" delay={0.1} className="glass rounded-3xl p-6">
            <Clock className="size-6 text-accent-2" aria-hidden />
            <p className="mt-6 text-xs uppercase tracking-wider text-muted">{str(c.availability) || "Your local time"}</p>
            <p className="font-display text-lg text-ink" suppressHydrationWarning>
              {time || "—"}
            </p>
          </Reveal>
          {profiles.slice(0, 4).map(([k, url], i) => (
            <Reveal as="li" key={k} delay={0.12 + i * 0.04}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="group glass flex h-full items-center justify-between rounded-3xl p-6 capitalize text-ink transition hover:border-accent/50">
                {k === "x" ? "X / Twitter" : k}
                <ArrowUpRight className="size-5 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-2" aria-hidden />
              </a>
            </Reveal>
          ))}
        </ul>
        {c.showForm !== false && (
          <Reveal delay={0.1} className="mx-auto mt-12 max-w-3xl">
            <ContactForm />
          </Reveal>
        )}
      </div>
    </section>
  );
}
