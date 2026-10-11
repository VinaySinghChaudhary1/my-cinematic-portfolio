export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { getPublicSite, projectSlug } from "@/lib/server/content";
import { pickSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { sections, settings } = await getPublicSite();
  const base = pickSiteUrl(settings.domain?.siteUrl, process.env.SITE_URL);
  const projects = sections.filter((s) => s.type === "projects").flatMap((s) => s.items);
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...projects.map((p) => ({ url: `${base}/projects/${projectSlug(p.data)}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...(settings.privacy.published ? [{ url: `${base}/privacy`, priority: 0.2 }] : []),
  ];
}
