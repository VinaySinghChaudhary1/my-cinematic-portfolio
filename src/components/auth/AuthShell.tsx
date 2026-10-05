import Link from "next/link";

/** Shared frame for sign-in, forgot-password, reset and beta pages. */
export function AuthShell({ badge, title, subtitle, children, back = { href: "/", label: "← Back to the website" } }: { badge: string; title: string; subtitle?: string; children: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--accent)_25%,transparent),transparent_55%),radial-gradient(circle_at_80%_80%,color-mix(in_oklab,var(--accent-2)_18%,transparent),transparent_50%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 font-display text-lg font-bold text-white shadow-[0_0_40px_-6px_var(--accent)]">{badge}</span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-faint">
          <Link href={back.href} className="hover:text-ink">
            {back.label}
          </Link>
        </p>
      </div>
    </main>
  );
}

export const AUTH_ERRORS: Record<string, string> = {
  google_off: "Google sign-in isn't set up on this site yet.",
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "The sign-in took too long or was opened in another tab. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
  google_not_allowed: "This Google account isn't allowed to sign in here.",
  google_admin_use_admin: "That Google account belongs to the site owner — use the admin sign-in.",
  locked: "Too many failed attempts. Try again in 15 minutes.",
  rate: "Too many attempts. Wait a few minutes and try again.",
};

export function GoogleButton({ href, label = "Continue with Google" }: { href: string; label?: string }) {
  return (
    <a href={href} className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-[#1f1f1f] transition hover:bg-white/90">
      <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
        <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
      </svg>
      {label}
    </a>
  );
}
