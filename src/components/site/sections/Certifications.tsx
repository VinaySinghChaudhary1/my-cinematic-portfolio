"use client";
import { useState } from "react";
import { Award, ExternalLink, FileText, Maximize2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { arr, cn, formatMonth, str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import { TiltCard } from "./TiltCard";
import type { SectionProps } from "./types";

export function Certifications({ section, index }: SectionProps) {
  const certs = section.items;
  const issuers = Array.from(new Set(certs.map((c) => str(c.data.issuer)).filter(Boolean)));
  const [issuer, setIssuer] = useState("All");
  const [open, setOpen] = useState<string | null>(null);
  const shown = issuer === "All" ? certs : certs.filter((c) => str(c.data.issuer) === issuer);
  const current = certs.find((c) => c.id === open);

  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="section-pad relative z-10">
      <div className="container-x">
        <SectionHeading index={index} id={section.key} title={section.title} subtitle={section.subtitle} />
        {section.config.showFilters !== false && issuers.length > 1 && (
          <div role="group" aria-label="Filter by issuer" className="mb-8 flex flex-wrap gap-2">
            {["All", ...issuers].map((x) => (
              <button
                key={x}
                aria-pressed={issuer === x}
                onClick={() => setIssuer(x)}
                className={cn("rounded-full border px-4 py-2 text-sm", issuer === x ? "border-transparent bg-ink text-bg" : "border-line text-muted hover:text-ink")}
              >
                {x}
              </button>
            ))}
          </div>
        )}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c, i) => {
            const d = c.data;
            return (
              <Reveal as="li" key={c.id} delay={(i % 3) * 0.08}>
                <TiltCard max={8} className="glass h-full overflow-hidden rounded-3xl">
                  <button onClick={() => setOpen(c.id)} className="group relative block w-full text-left" aria-label={`View certificate: ${str(d.title)}`}>
                    {str(d.image) ? (
                      <img src={str(d.image)} alt="" loading="lazy" className="aspect-[7/5] w-full bg-white object-cover transition duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="grid aspect-[7/5] place-items-center bg-white/5">
                        <Award className="size-10 text-accent-2" aria-hidden />
                      </div>
                    )}
                    <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                      <Maximize2 className="size-4" aria-hidden />
                    </span>
                  </button>
                  <div className="p-5">
                    <p className="font-mono text-xs text-faint">{formatMonth(d.issueDate)}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-ink">{str(d.title)}</h3>
                    <p className="text-sm text-muted">{str(d.issuer)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {arr(d.skills).map((s) => (
                        <span key={s} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-muted">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </ul>
      </div>

      <Modal open={!!current} onClose={() => setOpen(null)} title={current ? str(current.data.title) : "Certificate"} wide>
        {current && (
          <div className="grid gap-0 md:grid-cols-[1.6fr_1fr]">
            <div className="bg-black/40 p-4">
              {str(current.data.image) ? (
                <img src={str(current.data.image)} alt={`Certificate: ${str(current.data.title)}`} className="mx-auto max-h-[70dvh] w-auto rounded-lg" />
              ) : str(current.data.file) ? (
                <iframe src={str(current.data.file)} title="Certificate PDF" className="h-[70dvh] w-full rounded-lg bg-white" />
              ) : null}
            </div>
            <div className="space-y-3 p-6 text-sm">
              <p className="text-muted">
                Issued by <span className="text-ink">{str(current.data.issuer)}</span>
              </p>
              {str(current.data.issueDate) && <p className="text-muted">Issued: {formatMonth(current.data.issueDate)}</p>}
              {str(current.data.expiryDate) && <p className="text-muted">Expires: {formatMonth(current.data.expiryDate)}</p>}
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
    </section>
  );
}
