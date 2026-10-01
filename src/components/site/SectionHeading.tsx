import { Reveal } from "./Reveal";

export function SectionHeading({ index, title, subtitle, id }: { index: number; title: string; subtitle?: string; id: string }) {
  return (
    <div className="mb-12 md:mb-16">
      <Reveal>
        <p className="eyebrow flex items-center gap-3">
          <span className="text-faint">{String(index).padStart(2, "0")}</span>
          <span className="h-px w-10 bg-gradient-to-r from-accent-2 to-transparent" />
          {title}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 id={`${id}-title`} className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
          {subtitle || title}
        </h2>
      </Reveal>
    </div>
  );
}
