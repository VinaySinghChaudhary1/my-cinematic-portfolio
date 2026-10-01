import { Mail, MapPin } from "lucide-react";
import { SocialLinks } from "@/components/ui/SocialIcon";
import { str } from "@/lib/utils";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";
import { ContactForm } from "./ContactForm";
import type { SectionProps } from "./types";

export function Contact({ section, settings, index }: SectionProps) {
  const c = section.config;
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
              <ContactForm />
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
