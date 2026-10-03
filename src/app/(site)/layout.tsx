import { getPublicSite } from "@/lib/server/content";
import { getCurrentUser } from "@/lib/server/auth";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Maintenance } from "@/components/site/Maintenance";
import { navLinks } from "@/components/site/nav-links";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { settings, sections } = await getPublicSite();
  if (settings.maintenance.enabled && !(await getCurrentUser())) {
    return <Maintenance name={settings.profile.name} message={settings.maintenance.message} socials={settings.socials} />;
  }
  const a = settings.appearance;
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
      {settings.maintenance.enabled && (
        <div className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-full border border-warn/40 bg-bg-2/90 px-4 py-1.5 text-xs text-warn">
          Maintenance mode is ON — only you can see the site.
        </div>
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
    </>
  );
}
