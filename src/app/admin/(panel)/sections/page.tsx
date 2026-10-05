import { getAllSections } from "@/lib/server/content";
import { db, schema } from "@/db";
import { count } from "drizzle-orm";
import { getSectionType } from "@/lib/registry";
import { layoutsFor, resolveLayout } from "@/lib/layouts";
import { PageHeader } from "@/components/admin/ui";
import { SectionsManager } from "@/components/admin/SectionsManager";

export default async function SectionsPage() {
  const sections = await getAllSections();
  const counts = await db.select({ key: schema.items.sectionKey, n: count() }).from(schema.items).groupBy(schema.items.sectionKey);
  const map = Object.fromEntries(counts.map((c) => [c.key, c.n]));
  const rows = sections.map((s) => ({
    key: s.key,
    title: s.title,
    type: s.type,
    typeLabel: getSectionType(s.type)?.label ?? s.type,
    description: getSectionType(s.type)?.description ?? "",
    enabled: s.enabled,
    showInNav: s.showInNav,
    audience: s.audience,
    itemCount: map[s.key] ?? 0,
    hasItems: !!getSectionType(s.type)?.itemFields,
    layoutLabel: layoutsFor(s.type).find((l) => l.value === resolveLayout(s.type, s.config.layout))?.label ?? "",
    layoutCount: layoutsFor(s.type).length,
  }));
  return (
    <>
      <PageHeader
        title="Sections & content"
        description="Turn sections on or off, choose whether they appear in the menu, keep a section for beta testers only while you test it, and change the order. Click a section to edit its content."
      />
      <SectionsManager initial={rows} />
    </>
  );
}
