import type { PublicSection } from "@/lib/server/content";

export function navLinks(sections: PublicSection[]) {
  return sections
    .filter((s) => s.type !== "hero" && s.showInNav)
    .filter((s) => ["about", "contact", "projects"].includes(s.type) || s.items.length > 0)
    .map((s) => ({ key: s.key, title: s.title }));
}
