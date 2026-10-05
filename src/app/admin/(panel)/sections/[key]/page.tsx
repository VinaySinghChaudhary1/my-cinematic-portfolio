import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllSections, getItems } from "@/lib/server/content";
import { getSectionType } from "@/lib/registry";
import { SectionEditor } from "@/components/admin/SectionEditor";

export default async function EditSectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const section = (await getAllSections()).find((s) => s.key === key);
  if (!section) notFound();
  const def = getSectionType(section.type);
  if (!def) notFound();
  const items = def.itemFields ? await getItems(key) : [];
  return (
    <>
      <Link href="/admin/sections" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All sections
      </Link>
      <SectionEditor
        section={{ key: section.key, type: section.type, title: section.title, subtitle: section.subtitle, enabled: section.enabled, config: section.config }}
        typeLabel={def.label}
        description={def.description}
        items={items.map((i) => ({ id: i.id, data: i.data, visible: i.visible, featured: i.featured, status: i.status, publishAt: i.publishAt }))}
      />
    </>
  );
}
