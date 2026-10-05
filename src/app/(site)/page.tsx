import { getPublicSite } from "@/lib/server/content";
import { SectionRenderer } from "@/components/site/SectionRenderer";
import { EmptyState } from "@/components/ui/States";
import { PreviewBanner } from "@/components/site/PreviewBanner";
import { getCurrentUser } from "@/lib/server/auth";
import { getViewer } from "@/lib/server/viewer";
import { layoutsFor } from "@/lib/layouts";

/**
 * Admin-only layout preview: /?preview=projects:rows,skills:radar
 * Lets the owner try a design before saving it. Ignored for visitors, and only
 * layout values that exist in the catalogue are accepted.
 */
async function previewOverrides(raw: string | string[] | undefined): Promise<Record<string, string>> {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value.length > 500) return {};
  if (!(await getCurrentUser())) return {};
  const out: Record<string, string> = {};
  for (const pair of value.split(",").slice(0, 20)) {
    const [key, layout] = pair.split(":");
    if (key && layout && /^[\w-]{1,60}$/.test(key) && /^[\w-]{1,40}$/.test(layout)) out[key] = layout;
  }
  return out;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const site = await getPublicSite((await getViewer()).mode);
  const overrides = await previewOverrides((await searchParams).preview);
  const settings = site.settings;
  const sections = site.sections.map((s) =>
    overrides[s.key] && layoutsFor(s.type).some((l) => l.value === overrides[s.key]) ? { ...s, config: { ...s.config, layout: overrides[s.key] } } : s,
  );
  const previewing = site.sections
    .filter((s) => overrides[s.key] && layoutsFor(s.type).some((l) => l.value === overrides[s.key]))
    .map((s) => ({ key: s.key, title: s.title, layout: layoutsFor(s.type).find((l) => l.value === overrides[s.key])!.label }));
  const hero = sections.filter((s) => s.type === "hero");
  const rest = sections.filter((s) => s.type !== "hero");
  const sameAs = Object.values(settings.socials).filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.profile.name,
    description: settings.profile.tagline,
    jobTitle: settings.profile.headline,
    sameAs,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {previewing.length > 0 && <PreviewBanner items={previewing} />}
      <SectionRenderer sections={hero} settings={settings} />
      <div id="main-content">
        {sections.length === 0 ? (
          <div className="container-x pt-40 pb-20">
            <EmptyState title="Nothing to show yet" text="All sections are currently turned off. Turn some on from the admin panel." />
          </div>
        ) : (
          <SectionRenderer sections={rest} settings={settings} />
        )}
      </div>
    </>
  );
}
