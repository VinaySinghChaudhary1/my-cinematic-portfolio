import type { PublicSection } from "@/lib/server/content";
import type { SiteSettings } from "@/lib/settings-def";
import { Hero } from "./sections/Hero";
import { About } from "./sections/About";
import { Education } from "./sections/Education";
import { Skills } from "./sections/Skills";
import { Projects } from "./sections/Projects";
import { Experience } from "./sections/Experience";
import { Certifications } from "./sections/Certifications";
import { Achievements } from "./sections/Achievements";
import { Gallery } from "./sections/Gallery";
import { Roadmap } from "./sections/Roadmap";
import { Testimonials } from "./sections/Testimonials";
import { Blog } from "./sections/Blog";
import { Contact } from "./sections/Contact";
import type { SectionProps } from "./sections/types";

const COMPONENTS: Record<string, React.ComponentType<SectionProps>> = {
  hero: Hero,
  about: About,
  education: Education,
  skills: Skills,
  projects: Projects,
  experience: Experience,
  certifications: Certifications,
  achievements: Achievements,
  gallery: Gallery,
  roadmap: Roadmap,
  testimonials: Testimonials,
  blog: Blog,
  contact: Contact,
};

/** Renders enabled sections in admin-defined order. Item-based sections with no visible items are skipped. */
export function SectionRenderer({ sections, settings }: { sections: PublicSection[]; settings: SiteSettings }) {
  let n = 0;
  return (
    <>
      {sections.map((s) => {
        const C = COMPONENTS[s.type];
        if (!C) return null;
        const needsItems = !["hero", "contact", "about"].includes(s.type);
        if (needsItems && s.items.length === 0 && s.type !== "projects") return null;
        if (s.type !== "hero") n++;
        return <C key={s.key} section={s} settings={settings} index={n} />;
      })}
    </>
  );
}
