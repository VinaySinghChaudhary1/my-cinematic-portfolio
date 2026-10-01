import type { PublicSection } from "@/lib/server/content";
import type { SiteSettings } from "@/lib/settings-def";
import { resolveLayout } from "@/lib/layouts";
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
import { HeroTerminal, HeroSplit, HeroCinematic } from "./sections/variants/HeroVariants";
import { AboutBento, AboutChapters } from "./sections/variants/AboutVariants";
import { EducationLadder, EducationList } from "./sections/variants/EducationVariants";
import { SkillsMarquee, SkillsRadar, SkillsOrbit } from "./sections/variants/SkillsVariants";
import { ProjectsRows, ProjectsStack, ProjectsBento } from "./sections/variants/ProjectsVariants";
import { ExperienceTimeline, ExperienceTabs } from "./sections/variants/ExperienceVariants";
import { CertificationsBadges, CertificationsCarousel } from "./sections/variants/CertificationsVariants";
import { AchievementsPodium, AchievementsTimeline } from "./sections/variants/AchievementsVariants";
import { RoadmapKanban, RoadmapGantt, TestimonialsWall, BlogFeatured, BlogList } from "./sections/variants/MiscVariants";
import { TestimonialsSpotlight, ContactMinimal, ContactCards } from "./sections/variants/ClientMiscVariants";
import type { SectionProps } from "./sections/types";

type C = React.ComponentType<SectionProps>;

/**
 * section type → layout value → component. Keys must match `src/lib/layouts.ts`.
 * Only the component of the chosen layout is rendered, so visitors download only that design's code.
 */
const VARIANTS: Record<string, Record<string, C>> = {
  hero: { classic: Hero, terminal: HeroTerminal, split: HeroSplit, cinematic: HeroCinematic },
  about: { classic: About, bento: AboutBento, chapters: AboutChapters },
  education: { classic: Education, ladder: EducationLadder, list: EducationList },
  skills: { classic: Skills, marquee: SkillsMarquee, radar: SkillsRadar, orbit: SkillsOrbit },
  projects: { classic: Projects, rows: ProjectsRows, stack: ProjectsStack, bento: ProjectsBento },
  experience: { classic: Experience, timeline: ExperienceTimeline, tabs: ExperienceTabs },
  certifications: { classic: Certifications, badges: CertificationsBadges, carousel: CertificationsCarousel },
  achievements: { classic: Achievements, podium: AchievementsPodium, timeline: AchievementsTimeline },
  gallery: { ring: Gallery, masonry: Gallery, polaroid: Gallery, filmstrip: Gallery },
  roadmap: { classic: Roadmap, kanban: RoadmapKanban, gantt: RoadmapGantt },
  testimonials: { classic: Testimonials, spotlight: TestimonialsSpotlight, wall: TestimonialsWall },
  blog: { classic: Blog, featured: BlogFeatured, list: BlogList },
  contact: { classic: Contact, minimal: ContactMinimal, cards: ContactCards },
};

export function componentFor(type: string, layout: unknown): C | undefined {
  const map = VARIANTS[type];
  if (!map) return undefined;
  return map[resolveLayout(type, layout)] ?? Object.values(map)[0];
}

/** Renders enabled sections in admin-defined order, each with its chosen layout. */
export function SectionRenderer({ sections, settings }: { sections: PublicSection[]; settings: SiteSettings }) {
  let n = 0;
  return (
    <>
      {sections.map((s) => {
        const layout = resolveLayout(s.type, s.config.layout);
        const C = componentFor(s.type, layout);
        if (!C) return null;
        const needsItems = !["hero", "contact", "about"].includes(s.type);
        if (needsItems && s.items.length === 0 && s.type !== "projects") return null;
        if (s.type !== "hero") n++;
        const section = { ...s, config: { ...s.config, layout } };
        return <C key={s.key} section={section} settings={settings} index={n} />;
      })}
    </>
  );
}
