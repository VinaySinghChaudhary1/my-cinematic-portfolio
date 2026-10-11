export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/server/content";
import { pickSiteUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  const base = pickSiteUrl(s.domain?.siteUrl, process.env.SITE_URL);
  return {
    rules: s.seo.indexable ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
