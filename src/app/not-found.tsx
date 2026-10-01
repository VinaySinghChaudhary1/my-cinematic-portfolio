import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_60%)]" />
      <div className="relative">
        <p aria-hidden className="font-display text-[clamp(7rem,25vw,16rem)] font-bold leading-none text-gradient opacity-90">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">This scene doesn&apos;t exist</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">The page you&apos;re looking for was moved, removed, or never existed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-bg">
            <Compass className="size-4" aria-hidden /> Back to home
          </Link>
          <Link href="/#projects" className="rounded-full border border-line px-6 py-3 text-ink">
            See projects
          </Link>
        </div>
      </div>
    </main>
  );
}
