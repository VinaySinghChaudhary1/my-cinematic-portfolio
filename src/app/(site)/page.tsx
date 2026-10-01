import { getPublicSite } from "@/lib/server/content";
import { SectionRenderer } from "@/components/site/SectionRenderer";
import { EmptyState } from "@/components/ui/States";

export default async function HomePage() {
  const { settings, sections } = await getPublicSite();
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
