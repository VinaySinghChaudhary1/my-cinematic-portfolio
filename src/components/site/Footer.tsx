import Link from "next/link";
import { SocialLinks } from "@/components/ui/SocialIcon";
import { BackToTop } from "./BackToTop";

export function Footer({
  name,
  text,
  socials,
  showBuiltWith,
  privacy,
  adminLink = false,
}: {
  name: string;
  text: string;
  socials: Record<string, string>;
  showBuiltWith: boolean;
  privacy: boolean;
  adminLink?: boolean;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 border-t border-line bg-bg/60 backdrop-blur">
      <div className="container-x flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">{name}</p>
          {text && <p className="mt-2 max-w-sm text-sm text-muted">{text}</p>}
        </div>
        <SocialLinks socials={socials} />
      </div>
      <div className="container-x flex flex-col gap-3 border-t border-line py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {name}. All rights reserved.
          {showBuiltWith && <span className="ml-1">Built with Next.js, Three.js & GSAP.</span>}
        </p>
        <div className="flex items-center gap-4">
          {privacy && (
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
          )}
          {adminLink && (
            <Link href="/admin/login" className="hover:text-ink" rel="nofollow">
              Admin
            </Link>
          )}
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
