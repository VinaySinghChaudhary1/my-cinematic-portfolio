import { PageHeader } from "@/components/admin/ui";
import { MoveCenter } from "@/components/admin/MoveCenter";
import { activeTransfer, hostFacts } from "@/lib/server/move";
import { getSettings } from "@/lib/server/content";

export const metadata = { title: "Move & domain" };

export default async function MovePage() {
  const [facts, active, s] = await Promise.all([hostFacts(), activeTransfer(), getSettings()]);
  return (
    <>
      <PageHeader
        title="Move & domain"
        description="Change your domain, check DNS, plan a move to another host and copy the whole site there — all from here. The code never needs to change."
      />
      <MoveCenter
        facts={{ host: facts.host, database: facts.database, files: facts.files, ephemeral: facts.ephemeral, siteUrl: facts.siteUrl, envSiteUrl: facts.envSiteUrl, settingSiteUrl: s.domain?.siteUrl ?? "", email: facts.email, google: facts.google }}
        active={active}
      />
    </>
  );
}
