import { Globe, Mail, Play, Camera, Code2, BookOpen, Trophy } from "lucide-react";

/** Minimal brand-neutral glyphs (lucide v1 ships no brand logos). */
function Gh(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}
function In(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm7 0h3.8v1.5h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1v5.46h-4v-4.84c0-1.15-.02-2.64-1.6-2.64-1.62 0-1.86 1.26-1.86 2.56v4.92h-4v-11Z" />
    </svg>
  );
}
function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.7H5.57l11.1 14.5Z" />
    </svg>
  );
}

const MAP: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  github: { label: "GitHub", Icon: Gh },
  linkedin: { label: "LinkedIn", Icon: In },
  x: { label: "X (Twitter)", Icon: X },
  instagram: { label: "Instagram", Icon: Camera },
  youtube: { label: "YouTube", Icon: Play },
  leetcode: { label: "LeetCode", Icon: Code2 },
  kaggle: { label: "Kaggle", Icon: Trophy },
  medium: { label: "Blog", Icon: BookOpen },
  website: { label: "Website", Icon: Globe },
  email: { label: "Email", Icon: Mail },
};

export function SocialLinks({ socials, email, className = "" }: { socials: Record<string, string>; email?: string; className?: string }) {
  const entries = Object.entries(socials).filter(([k, v]) => v && MAP[k]);
  if (email) entries.push(["email", `mailto:${email}`]);
  if (!entries.length) return null;
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`}>
      {entries.map(([k, href]) => {
        const { label, Icon } = MAP[k];
        return (
          <li key={k}>
            <a
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              data-cursor="hover"
              className="grid size-11 place-items-center rounded-full border border-line bg-glass text-muted transition hover:-translate-y-0.5 hover:border-accent hover:text-ink"
            >
              <Icon className="size-[18px]" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
