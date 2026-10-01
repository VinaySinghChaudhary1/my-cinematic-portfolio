"use client";
import { useEffect, useRef, useState } from "react";
import { Award, ChevronLeft, ChevronRight, ExternalLink, FileText, BadgeCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn, formatMonth, str } from "@/lib/utils";
import { SectionHeading } from "../../SectionHeading";
import { Reveal } from "../../Reveal";
import type { SectionProps } from "../types";

type Item = SectionProps["section"]["items"][number];

function CertModal({ current, onClose }: { current: Item | undefined; onClose: () => void }) {
  return (
    <Modal open={!!current} onClose={onClose} title={current ? str(current.data.title) : "Certificate"} wide>
      {current && (
        <div className="grid md:grid-cols-[1.6fr_1fr]">
          <div className="bg-black/40 p-4">
            {str(current.data.image) ? (
              <img src={str(current.data.image)} alt={`Certificate: ${str(current.data.title)}`} className="mx-auto max-h-[70dvh] w-auto rounded-lg" />
            ) : str(current.data.file) ? (
              <iframe src={str(current.data.file)} title="Certificate PDF" className="h-[70dvh] w-full rounded-lg bg-white" />
            ) : (
              <div className="grid h-60 place-items-center text-muted">No preview</div>
            )}
          </div>
          <div className="space-y-3 p-6 text-sm">
            <p className="text-muted">
              Issued by <span className="text-ink">{str(current.data.issuer)}</span>
            </p>
            {str(current.data.issueDate) && <p className="text-muted">Issued: {formatMonth(current.data.issueDate)}</p>}
            {str(current.data.credentialId) && (
              <p className="text-muted">
                Credential ID: <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-ink">{str(current.data.credentialId)}</code>
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {str(current.data.credentialUrl) && (
                <a href={str(current.data.credentialUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-medium text-bg">
                  Verify <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
              {str(current.data.file) && (
                <a href={str(current.data.file)} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-ink">
                  <FileText className="size-4" aria-hidden /> Open PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ───────────── Badge wall ───────────── */
export function CertificationsBadges({ section, index }: SectionProps) {
  const [open, setOpen] = useState<string | null>(null);
  const issuers = Array.from(new Set(section.items.map((c) => str(c.data.issuer)).filter(Boolean)));
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <p className="-mt-6 mb-10 flex flex-wrap items-center gap-2 text-sm text-muted">
          <BadgeCheck className="size-4 text-accent-2" aria-hidden /> {section.items.length} certificates from {issuers.length} issuer{issuers.length === 1 ? "" : "s"}
        </p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {section.items.map((c, i) => (
            <Reveal as="li" key={c.id} delay={(i % 5) * 0.05}>
              <button
                onClick={() => setOpen(c.id)}
                className="group flex h-full w-full flex-col items-center gap-3 rounded-3xl border border-line bg-white/[0.03] p-6 text-center transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_20px_40px_-15px_var(--accent)]"
                aria-label={`View certificate: ${str(c.data.title)}`}
              >
                <span className="relative grid size-24 place-items-center rounded-full bg-[conic-gradient(from_180deg,var(--accent),var(--accent-2),var(--accent))] p-[3px] transition duration-500 group-hover:rotate-12">
                  <span className="grid size-full place-items-center overflow-hidden rounded-full bg-bg-2">
                    {str(c.data.image) ? <img src={str(c.data.image)} alt="" loading="lazy" className="size-full object-cover" /> : <Award className="size-9 text-accent-2" aria-hidden />}
                  </span>
                  <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-success text-bg">
                    <BadgeCheck className="size-4" aria-hidden />
                  </span>
                </span>
                <span className="line-clamp-2 text-sm font-medium text-ink">{str(c.data.title)}</span>
                <span className="text-xs text-accent-2">{str(c.data.issuer)}</span>
                <span className="font-mono text-[11px] text-faint">{formatMonth(c.data.issueDate)}</span>
              </button>
            </Reveal>
          ))}
        </ul>
      </div>
      <CertModal current={section.items.find((c) => c.id === open)} onClose={() => setOpen(null)} />
    </section>
  );
}

/* ───────────── Coverflow carousel ───────────── */
export function CertificationsCarousel({ section, index }: SectionProps) {
  const items = section.items;
  const [i, setI] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const touch = useRef<number | null>(null);
  const n = items.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);
  const cur = items[i];
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10 overflow-hidden">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        <div
          className="relative h-[300px] [perspective:1400px] sm:h-[380px]"
          role="group"
          aria-roledescription="carousel"
          aria-label="Certificates"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          {items.map((c, k) => {
            let off = k - i;
            if (off > n / 2) off -= n;
            if (off < -n / 2) off += n;
            const abs = Math.abs(off);
            if (abs > 3) return null;
            return (
              <button
                key={c.id}
                onClick={() => (off === 0 ? setOpen(c.id) : setI(k))}
                tabIndex={off === 0 ? 0 : -1}
                aria-label={off === 0 ? `View certificate: ${str(c.data.title)}` : `Show ${str(c.data.title)}`}
                className="absolute left-1/2 top-1/2 w-[72vw] max-w-[440px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] transition-all duration-500 ease-out"
                style={{
                  transform: `translate(-50%, -50%) translateX(${off * 46}%) translateZ(${-abs * 160}px) rotateY(${off * -32}deg)`,
                  zIndex: 10 - abs,
                  opacity: abs > 2 ? 0 : 1 - abs * 0.25,
                  filter: off === 0 ? "none" : "brightness(0.55)",
                }}
              >
                {str(c.data.image) ? (
                  <img src={str(c.data.image)} alt="" loading="lazy" className="aspect-[7/5] w-full object-cover" draggable={false} />
                ) : (
                  <span className="grid aspect-[7/5] place-items-center bg-bg-2">
                    <Award className="size-12 text-accent-2" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {cur && (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <div aria-live="polite">
              <p className="font-display text-xl font-semibold text-ink">{str(cur.data.title)}</p>
              <p className="text-sm text-muted">
                {str(cur.data.issuer)} · {formatMonth(cur.data.issueDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => go(-1)} aria-label="Previous certificate" className="grid size-11 place-items-center rounded-full border border-line hover:border-accent">
                <ChevronLeft className="size-5" />
              </button>
              <span className="font-mono text-xs text-faint">
                {i + 1} / {n}
              </span>
              <button onClick={() => go(1)} aria-label="Next certificate" className="grid size-11 place-items-center rounded-full border border-line hover:border-accent">
                <ChevronRight className="size-5" />
              </button>
            </div>
            <ul className="flex gap-1.5" aria-hidden>
              {items.map((c, k) => (
                <li key={c.id} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-6 bg-accent-2" : "w-1.5 bg-white/20")} />
              ))}
            </ul>
          </div>
        )}
      </div>
      <CertModal current={items.find((c) => c.id === open)} onClose={() => setOpen(null)} />
    </section>
  );
}
