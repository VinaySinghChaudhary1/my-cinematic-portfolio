import { getAllSections, getSettings } from "@/lib/server/content";
import { emailConfigured } from "@/lib/server/email";
import { PageHeader } from "@/components/admin/ui";
import { TestersManager } from "@/components/admin/TestersManager";

export const metadata = { title: "Beta testers" };

export default async function TestersPage() {
  const [settings, sections] = await Promise.all([getSettings(), getAllSections()]);
  return (
    <>
      <PageHeader
        title="Beta testers"
        description="Give selected people a login to try new features before visitors see them — even while the site is in maintenance mode."
      />
      <TestersManager emailReady={emailConfigured()} maintenance={settings.maintenance.enabled} betaSections={sections.filter((s) => s.audience === "beta").length} />
    </>
  );
}
