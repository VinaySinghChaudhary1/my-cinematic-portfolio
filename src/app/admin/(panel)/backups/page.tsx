import { PageHeader } from "@/components/admin/ui";
import { BackupsManager } from "@/components/admin/backups/BackupsManager";

export const metadata = { title: "Backups" };

export default function BackupsPage() {
  return (
    <>
      <PageHeader
        title="Backups"
        description="One file with your whole site — content, designs, settings and files. Take one before every big update; restore or undo any time."
      />
      <BackupsManager />
    </>
  );
}
