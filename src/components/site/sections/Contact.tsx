"use client";
import { useRef, useState } from "react";
import { Send, Mail, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { SocialLinks } from "@/components/ui/SocialIcon";
import { SuccessState } from "@/components/ui/States";
import { cn, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import type { SectionProps } from "./types";

type Fields = { name: string; email: string; subject: string; message: string };
const EMPTY: Fields = { name: "", email: "", subject: "", message: "" };

function validate(v: Fields) {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (v.name.trim().length < 2) e.name = "Please enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "Please enter a valid email";
  if (v.message.trim().length < 10) e.message = "Message should be at least 10 characters";
  return e;
}

export function Contact({ section, settings, index }: SectionProps) {
  const c = section.config;
  const [v, setV] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [honey, setHoney] = useState("");
  const startedAt = useRef(Date.now());

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`cf-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setStatus("sending");
    setServerError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, website: honey, startedAt: startedAt.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        throw new Error(data.error || "Could not send your message.");
      }
      setStatus("sent");
      setV(EMPTY);
    } catch (err) {
      // keep everything the visitor typed so they can retry
      setStatus("error");
      setServerError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "You appear to be offline. Your message is still here — try again when you're connected."
          : err instanceof Error
            ? err.message
            : "Could not send your message.",
      );
    }
  }

  const input = (k: keyof Fields) =>
    cn(
      "w-full rounded-2xl border bg-white/[0.03] px-4 py-3.5 text-ink placeholder:text-faint transition focus:border-accent-2 focus:bg-white/[0.05] focus:outline-none",
      errors[k] ? "border-danger" : "border-line",
    );

  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_70%)]" />
      <div className="container-x relative">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={str(c.heading) || section.subtitle} />
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            {str(c.availability) && (
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
                <span className="size-2 rounded-full bg-success" aria-hidden /> {str(c.availability)}
              </p>
            )}
            {str(c.text) && <p className="text-lg leading-relaxed text-muted">{str(c.text)}</p>}
            <ul className="mt-8 space-y-4">
              {c.showEmail !== false && settings.profile.email && (
                <li>
                  <a href={`mailto:${settings.profile.email}`} className="group inline-flex items-center gap-3 text-ink">
                    <span className="grid size-11 place-items-center rounded-full border border-line bg-glass group-hover:border-accent">
                      <Mail className="size-4" aria-hidden />
                    </span>
                    <span className="font-display text-lg group-hover:text-gradient">{settings.profile.email}</span>
                  </a>
                </li>
              )}
              {settings.profile.location && (
                <li className="inline-flex items-center gap-3 text-muted">
                  <span className="grid size-11 place-items-center rounded-full border border-line bg-glass">
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  {settings.profile.location}
                </li>
              )}
            </ul>
            <SocialLinks socials={settings.socials} className="mt-8" />
          </Reveal>

          {c.showForm !== false && (
            <Reveal delay={0.1}>
              {status === "sent" ? (
                <SuccessState
                  title="Message sent!"
                  text="Thanks for reaching out — I'll get back to you by email soon."
                  action={
                    <button onClick={() => setStatus("idle")} className="mt-2 rounded-full border border-line px-4 py-2 text-sm text-ink">
                      Send another message
                    </button>
                  }
                />
              ) : (
                <form onSubmit={submit} noValidate className="glass glow-border space-y-4 rounded-3xl p-6 md:p-8" aria-describedby="cf-privacy">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="cf-name" className="mb-1.5 block text-sm text-muted">
                        Name <span aria-hidden className="text-danger">*</span>
                      </label>
                      <input id="cf-name" autoComplete="name" value={v.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "cf-name-err" : undefined} className={input("name")} maxLength={80} required />
                      {errors.name && (
                        <p id="cf-name-err" className="mt-1.5 flex items-center gap-1 text-xs text-danger">
                          <AlertTriangle className="size-3" aria-hidden /> {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="cf-email" className="mb-1.5 block text-sm text-muted">
                        Email <span aria-hidden className="text-danger">*</span>
                      </label>
                      <input id="cf-email" type="email" autoComplete="email" value={v.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "cf-email-err" : undefined} className={input("email")} maxLength={200} required />
                      {errors.email && (
                        <p id="cf-email-err" className="mt-1.5 flex items-center gap-1 text-xs text-danger">
                          <AlertTriangle className="size-3" aria-hidden /> {errors.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cf-subject" className="mb-1.5 block text-sm text-muted">
                      Subject
                    </label>
                    <input id="cf-subject" value={v.subject} onChange={set("subject")} className={input("subject")} maxLength={150} />
                  </div>
                  <div>
                    <label htmlFor="cf-message" className="mb-1.5 block text-sm text-muted">
                      Message <span aria-hidden className="text-danger">*</span>
                    </label>
                    <textarea id="cf-message" rows={5} value={v.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "cf-message-err" : undefined} className={cn(input("message"), "resize-y")} maxLength={5000} required />
                    {errors.message && (
                      <p id="cf-message-err" className="mt-1.5 flex items-center gap-1 text-xs text-danger">
                        <AlertTriangle className="size-3" aria-hidden /> {errors.message}
                      </p>
                    )}
                  </div>
                  {/* honeypot — hidden from humans and screen readers */}
                  <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label>
                      Website <input tabIndex={-1} autoComplete="off" value={honey} onChange={(e) => setHoney(e.target.value)} />
                    </label>
                  </div>
                  {status === "error" && (
                    <p role="alert" className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {serverError}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <p id="cf-privacy" className="text-xs text-faint">
                      Your name, email and message are stored only so I can reply.
                    </p>
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3.5 font-medium text-white shadow-[0_10px_40px_-10px_var(--accent)] transition hover:scale-[1.02] disabled:opacity-60"
                    >
                      {status === "sending" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                      {status === "sending" ? "Sending…" : "Send message"}
                    </button>
                  </div>
                </form>
              )}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
