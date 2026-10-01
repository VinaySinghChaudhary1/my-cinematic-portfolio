/**
 * LAYOUT CATALOGUE — every switchable design for every section.
 *
 * The first entry of each list is the default. The admin "Design / layout" picker,
 * the server validation (only these values are accepted) and the public renderer all
 * read this file. To add a new design: add an entry here, build the component, and
 * register it in `src/components/site/SectionRenderer.tsx`.
 */

export interface LayoutOption {
  value: string;
  label: string;
  description: string;
  /** Uses WebGL / heavier animation — shown as a hint in the admin. */
  heavy?: boolean;
}

export const LAYOUTS: Record<string, LayoutOption[]> = {
  hero: [
    { value: "classic", label: "3D holo card", description: "Name reveal, typing roles and a draggable 3D photo card with orbit rings.", heavy: true },
    { value: "terminal", label: "Terminal boot", description: "A code terminal types out who you are, then your intro and buttons appear." },
    { value: "split", label: "Split parallax", description: "Large portrait on one side with layered parallax glow and floating skill chips." },
    { value: "cinematic", label: "Cinematic letterbox", description: "Movie-trailer framing: letterbox bars, giant centred title, photo backdrop." },
  ],
  about: [
    { value: "classic", label: "Photo + story", description: "Tilt photo card, biography, quick facts, animated counters and interests." },
    { value: "bento", label: "Bento grid", description: "Apple-style tiles: photo, bio, stats, facts, interests and location." },
    { value: "chapters", label: "Story chapters", description: "Your bio split into numbered chapters that reveal as you scroll." },
  ],
  education: [
    { value: "classic", label: "Glowing timeline", description: "Alternating timeline that draws itself on scroll, with status badges." },
    { value: "ladder", label: "Level tracker", description: "Progress stepper showing completed, current and upcoming levels." },
    { value: "list", label: "Minimal list", description: "Clean, recruiter-friendly typographic list." },
  ],
  skills: [
    { value: "classic", label: "3D sphere + bars", description: "Draggable 3D tag sphere next to category tabs with proficiency bars." },
    { value: "marquee", label: "Logo marquee", description: "Infinite scrolling rows of skills, one row per category." },
    { value: "radar", label: "Radar chart", description: "Spider chart of category strength plus a grouped skill list." },
    { value: "orbit", label: "Orbit planets", description: "Each category is a planet with its skills orbiting around it." },
  ],
  projects: [
    { value: "classic", label: "Featured grid", description: "Featured card, filters, search, status badges and show-more." },
    { value: "rows", label: "Netflix rows", description: "Horizontal rows per category with hover-expanding cards." },
    { value: "stack", label: "Scroll stack", description: "Large cards that stack on top of each other as you scroll." },
    { value: "bento", label: "Bento showcase", description: "Mixed-size tiles — featured projects get the big tiles." },
  ],
  experience: [
    { value: "classic", label: "Cards", description: "Glass cards with logo, dates, type, description and skills." },
    { value: "timeline", label: "Vertical timeline", description: "A single glowing line with each role as a milestone." },
    { value: "tabs", label: "Tabs by type", description: "Tabs for Internships, Clubs, Volunteering… to keep long lists tidy." },
  ],
  certifications: [
    { value: "classic", label: "Tilt cards", description: "Certificate images in 3D tilt cards with a full-screen viewer." },
    { value: "badges", label: "Badge wall", description: "Compact badges grouped by issuer — great for many certificates." },
    { value: "carousel", label: "Coverflow carousel", description: "Swipeable 3D carousel of certificates with arrows." },
  ],
  achievements: [
    { value: "classic", label: "Film reel", description: "Pinned horizontal scroll with cards rotating into view (desktop)." },
    { value: "podium", label: "Medal podium", description: "Top three on a podium, the rest listed underneath." },
    { value: "timeline", label: "Year timeline", description: "Achievements grouped by year along a timeline." },
  ],
  gallery: [
    { value: "ring", label: "3D ring", description: "Draggable 3D ring carousel that slowly rotates." },
    { value: "masonry", label: "Masonry grid", description: "Pinterest-style grid that keeps photo proportions." },
    { value: "polaroid", label: "Polaroid scatter", description: "Photos as tilted polaroids with captions that straighten on hover." },
    { value: "filmstrip", label: "Film strip", description: "Two endless film strips sliding in opposite directions." },
  ],
  roadmap: [
    { value: "classic", label: "Trailer cards", description: "“Coming soon” cards with big numbers and progress bars." },
    { value: "kanban", label: "Kanban board", description: "Planned · In progress · Done columns." },
    { value: "gantt", label: "Timeline bars", description: "Goals as bars across a calendar, Gantt-style." },
  ],
  testimonials: [
    { value: "classic", label: "Marquee", description: "Infinite scrolling quote cards that pause on hover." },
    { value: "spotlight", label: "Spotlight slider", description: "One large quote at a time with arrows and auto-play." },
    { value: "wall", label: "Wall of love", description: "Masonry wall showing every quote at once." },
  ],
  blog: [
    { value: "classic", label: "Cards", description: "Equal cards with cover, date, excerpt and tags." },
    { value: "featured", label: "Featured + list", description: "Newest article large, the rest as a compact list." },
    { value: "list", label: "Minimal list", description: "Text-only list with dates — clean and fast." },
  ],
  contact: [
    { value: "classic", label: "Form + details", description: "Contact details and socials beside the secure form." },
    { value: "minimal", label: "Big email", description: "Huge copy-able email address and socials — no form." },
    { value: "cards", label: "Contact cards", description: "Cards for email, location and profiles, with the form below." },
  ],
};

export function layoutsFor(type: string): LayoutOption[] {
  return LAYOUTS[type] ?? [];
}

export function defaultLayout(type: string): string {
  return LAYOUTS[type]?.[0]?.value ?? "classic";
}

/** Returns a valid layout value for the section type (falls back to the default). */
export function resolveLayout(type: string, value: unknown): string {
  const list = LAYOUTS[type];
  if (!list) return "classic";
  return typeof value === "string" && list.some((l) => l.value === value) ? value : list[0].value;
}
