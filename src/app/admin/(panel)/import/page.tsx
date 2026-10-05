import { PageHeader } from "@/components/admin/ui";
import { ImportManager } from "@/components/admin/ImportManager";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Bulk import"
        description="Fill many sections at once from your résumé or your LinkedIn data. You review everything first; entries are added as drafts, and a backup is taken so you can undo."
      />
      <ImportManager />
    </>
  );
}
