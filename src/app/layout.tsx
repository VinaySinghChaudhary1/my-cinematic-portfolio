import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/server/content";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSettings();
    const title = s.seo.title || `${s.profile.name} — Portfolio`;
    const description = s.seo.description || s.profile.tagline;
    const base = process.env.SITE_URL || "http://localhost:3000";
    return {
      metadataBase: new URL(base),
      title: { default: title, template: `%s · ${s.profile.name}` },
      description,
      keywords: s.seo.keywords,
      authors: [{ name: s.profile.name }],
      robots: s.seo.indexable ? { index: true, follow: true } : { index: false, follow: false },
      openGraph: { title, description, type: "website", images: s.seo.ogImage ? [{ url: s.seo.ogImage }] : [] },
      twitter: { card: "summary_large_image", title, description, images: s.seo.ogImage ? [s.seo.ogImage] : [] },
    };
  } catch {
    return { title: "Portfolio" };
  }
}

export const viewport: Viewport = { themeColor: "#05040b", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let accent = "#8b5cf6";
  let accent2 = "#22d3ee";
  try {
    const s = await getSettings();
    accent = s.appearance.accent || accent;
    accent2 = s.appearance.accent2 || accent2;
  } catch {
    // DB unavailable — render with defaults; error boundaries handle the rest
  }
  return (
    <html lang="en" style={{ ["--accent" as string]: accent, ["--accent-2" as string]: accent2 }} suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) add attributes to <body> before React loads */}
      <body suppressHydrationWarning>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
