export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/server/content";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  const base = process.env.SITE_URL || "http://localhost:3000";
  return {
    rules: s.seo.indexable ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
