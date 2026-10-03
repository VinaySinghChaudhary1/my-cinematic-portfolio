"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SETTINGS_GROUPS, type SettingsGroup } from "@/lib/settings-def";
import { api, ApiError } from "./api";
import { DynamicForm } from "./DynamicForm";
import { Button, Card } from "./ui";

const PRIVACY_TEMPLATE = `## Who I am
This website is the personal portfolio of [YOUR FULL NAME]. Contact: [YOUR EMAIL].

## What this site collects
- **Contact form:** your name, email address, optional subject and message. Used only to reply to you.
- **Server logs / security:** your IP address may be processed temporarily to prevent spam and abuse (rate-limiting).
- **Cookies:** visitors get no tracking or advertising cookies. A sign-in cookie is used only for the site owner's admin area. Your browser's session storage remembers that you've seen the intro animation.

## Where data is stored
[Describe your hosting and database provider, e.g. "Vercel (hosting) and Turso (database)".]

## How long it is kept
[e.g. "Messages are deleted after 12 months or when you ask."]

## Your choices
Email [YOUR EMAIL] to ask for a copy of, or deletion of, a message you sent.

## Changes
This notice may be updated; the effective date above shows the latest version.
`;

function Group({ group, initial }: { group: SettingsGroup; initial: Record<string, unknown> }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== saved;

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      await api(`/api/admin/settings/${group.key}`, { method: "PUT", json: values });
      setSaved(JSON.stringify(values));
      toast.success(`${group.label} saved`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id={group.key} aria-labelledby={`${group.key}-h`} className="scroll-mt-24">
      <Card>
        <h2 id={`${group.key}-h`} className="font-display text-lg font-semibold text-ink">
          {group.label}
        </h2>
        {group.description && <p className="mb-5 mt-1 text-sm text-muted">{group.description}</p>}
        {group.key === "privacy" && !String(values.content ?? "").trim() && (
          <div className="mb-5 rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
            No privacy notice written yet.{" "}
            <button type="button" className="underline" onClick={() => setValues({ ...values, content: PRIVACY_TEMPLATE })}>
              Insert a starter outline
            </button>{" "}
            — then replace every [BRACKETED] part with your real details before publishing.
          </div>
        )}
        <DynamicForm idPrefix={group.key} fields={group.fields} values={values} onChange={setValues} errors={errors} ai={["profile", "seo", "footer", "privacy"].includes(group.key) ? { target: "settings", settingsGroup: group.key } : undefined} />
        <div className="mt-6 flex items-center justify-end gap-3">
          {dirty && <span className="text-xs text-warn">Unsaved changes</span>}
          <Button
            onClick={() => {
              if (group.key === "privacy" && values.published && /\[[A-Z ]+\]/.test(String(values.content ?? ""))) {
                toast.error("Replace all [BRACKETED] placeholders before publishing the privacy notice.");
                return;
              }
              save();
            }}
            loading={saving}
            disabled={!dirty}
          >
            Save {group.label.toLowerCase()}
          </Button>
        </div>
      </Card>
    </section>
  );
}

export function SettingsForm({ initial }: { initial: Record<string, Record<string, unknown>> }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[200px_1fr]">
      <nav aria-label="Settings sections" className="hidden xl:block">
        <ul className="sticky top-8 space-y-1">
          {SETTINGS_GROUPS.map((g) => (
            <li key={g.key}>
              <a href={`#${g.key}`} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ink">
                {g.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-6">
        {SETTINGS_GROUPS.map((g) => (
          <Group key={g.key} group={g} initial={initial[g.key] ?? {}} />
        ))}
      </div>
    </div>
  );
}
