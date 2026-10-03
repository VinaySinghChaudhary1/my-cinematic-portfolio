"use client";
import { Switch } from "../ui";
import { cn } from "@/lib/utils";
import type { BackupOptions, SectionInfo } from "./types";

const TOGGLES: { key: Exclude<keyof BackupOptions, "sections">; label: string; help: string }[] = [
  { key: "settings", label: "Site settings", help: "Profile, social links, appearance, SEO, footer, privacy notice" },
  { key: "media", label: "Uploaded media", help: "Every photo and PDF in the media library" },
  { key: "bundled", label: "Bundled site files", help: "Photos, video, certificates and covers that ship with the code (/me/…)" },
  { key: "messages", label: "Contact messages", help: "Messages from visitors — personal data of other people" },
  { key: "audit", label: "Activity log", help: "Sign-ins and admin changes" },
];

/** The "what goes into the backup" picker, shared by manual backups and the schedule. */
export function IncludeOptions({ value, onChange, sections, idPrefix }: { value: BackupOptions; onChange: (v: BackupOptions) => void; sections: SectionInfo[]; idPrefix: string }) {
  const all = value.sections === "all";
  const picked = new Set(all ? sections.map((s) => s.key) : value.sections);
  const toggleSection = (key: string) => {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...value, sections: next.size === sections.length ? "all" : sections.filter((s) => next.has(s.key)).map((s) => s.key) });
  };
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="flex w-full items-center justify-between gap-3 text-sm font-medium text-ink">
          <span>Content sections</span>
          <span className="flex gap-2 text-xs font-normal">
            <button type="button" className="text-accent-2 hover:underline" onClick={() => onChange({ ...value, sections: "all" })}>
              All
            </button>
            <span className="text-faint">·</span>
            <button type="button" className="text-muted hover:underline" onClick={() => onChange({ ...value, sections: [] })}>
              None
            </button>
          </span>
        </legend>
        <ul className="mt-3 flex flex-wrap gap-2">
          {sections.map((s) => {
            const on = picked.has(s.key);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleSection(s.key)}
                  className={cn("rounded-full border px-3 py-1.5 text-xs transition", on ? "border-accent-2/60 bg-accent-2/10 text-ink" : "border-line text-faint hover:text-muted")}
                >
                  {on ? "✓ " : ""}
                  {s.title}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-faint">{all ? "All sections, their items and chosen designs." : `${picked.size} of ${sections.length} sections selected.`}</p>
      </fieldset>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {TOGGLES.map((t) => (
          <li key={t.key} className="flex items-center justify-between gap-4 px-4 py-3">
            <label htmlFor={`${idPrefix}-${t.key}`} className="min-w-0">
              <span className="block text-sm text-ink">{t.label}</span>
              <span className="block text-xs text-faint">{t.help}</span>
            </label>
            <Switch id={`${idPrefix}-${t.key}`} label={t.label} checked={value[t.key]} onChange={(v) => onChange({ ...value, [t.key]: v })} />
          </li>
        ))}
      </ul>
    </div>
  );
}
