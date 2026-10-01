import { getSettings } from "@/lib/server/content";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Site settings" description="Your profile, social links, colours & effects, SEO, maintenance mode and privacy notice. Each card saves on its own." />
      <SettingsForm initial={settings as unknown as Record<string, Record<string, unknown>>} />
    </>
  );
}
