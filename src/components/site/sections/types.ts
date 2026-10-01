import type { PublicSection } from "@/lib/server/content";
import type { SiteSettings } from "@/lib/settings-def";

export interface SectionProps {
  section: PublicSection;
  settings: SiteSettings;
  index: number;
}
