import { getPublicSite } from "@/lib/server/content";
import { getViewer } from "@/lib/server/viewer";
import { AccessBar } from "@/components/site/AccessBar";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Maintenance } from "@/components/site/Maintenance";
import { navLinks } from "@/components/site/nav-links";
import { AskChat } from "@/components/site/AskChat";
import { getAiConfig } from "@/lib/server/ai/config";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const { settings, sections } = await getPublicSite(viewer.mode);
  if (settings.maintenance.enabled && viewer.kind === "public") {
    return <Maintenance name={settings.profile.name} message={settings.maintenance.message} socials={settings.socials} />;
  }
  const betaSections = sections.filter((s) => s.audience === "beta").length;
  const drafts = viewer.previewOn ? sections.reduce((n, s) => n + s.items.filter((i) => i.preview).length, 0) : 0;
  const showBar = viewer.kind === "tester" || (viewer.kind === "admin" && (settings.maintenance.enabled || betaSections > 0 || viewer.previewOn));
  const a = settings.appearance;
  const chat = (await getAiConfig()).chat;
  const chatOn = chat.mode === "public" || (chat.mode === "beta" && viewer.kind !== "public");
  return (
    <>
      <SiteChrome
        name={settings.profile.name}
        accent={a.accent}
        accent2={a.accent2}
        preloader={a.preloader}
        background3D={a.background3D}
        cursor={a.customCursor}
        smooth={a.smoothScroll}
        grain={a.filmGrain}
      />
      {showBar && viewer.kind !== "public" && (
        <AccessBar kind={viewer.kind} name={viewer.name} maintenance={settings.maintenance.enabled} canPreview={viewer.canPreview} previewOn={viewer.previewOn} drafts={drafts} betaSections={betaSections} />
      )}
      <Navbar initials={settings.profile.initials || settings.profile.name.slice(0, 2)} logo={settings.profile.logo} name={settings.profile.name} links={navLinks(sections)} resume={settings.profile.resume} />
      <main id="main" className="relative">
        {children}
      </main>
      <Footer
        name={settings.profile.name}
        text={settings.footer.text}
        socials={settings.socials}
        showBuiltWith={settings.footer.showBuiltWith}
        privacy={settings.privacy.published}
        adminLink={settings.footer.showAdminLink}
      />
      {chatOn && <AskChat name={settings.profile.name} greeting={chat.greeting} beta={chat.mode === "beta"} />}
    </>
  );
}
