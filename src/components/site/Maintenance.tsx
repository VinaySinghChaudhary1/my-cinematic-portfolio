import { Wrench } from "lucide-react";
import { SocialLinks } from "@/components/ui/SocialIcon";

export function Maintenance({ name, message, socials }: { name: string; message: string; socials: Record<string, string> }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--accent)_25%,transparent),transparent_60%)]" />
      <div className="relative max-w-lg">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-line bg-glass">
          <Wrench className="size-7 text-accent-2" aria-hidden />
        </span>
        <p className="eyebrow mt-8">Scheduled maintenance</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ink sm:text-5xl">{name} will be right back</h1>
        <p className="mt-4 text-muted">{message}</p>
        <SocialLinks socials={socials} className="mt-8 justify-center" />
      </div>
    </main>
  );
}
