import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/server/content";

export const dynamic = "force-dynamic";

/** Web app manifest → the site can be installed ("Add to Home screen" / "Install app"). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Portfolio";
  let description = "Portfolio";
  try {
    const s = await getSettings();
    name = s.profile.name || name;
    description = s.seo.description || s.profile.tagline || description;
  } catch {
    /* defaults */
  }
  return {
    id: "/",
    name: `${name} — Portfolio`,
    short_name: name.split(/\s+/)[0] || "Portfolio",
    description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#05040b",
    theme_color: "#05040b",
    categories: ["portfolio", "personal"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
