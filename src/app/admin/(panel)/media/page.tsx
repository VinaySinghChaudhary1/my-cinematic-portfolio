import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export default function MediaPage() {
  const storage = process.env.BLOB_READ_WRITE_TOKEN ? "Vercel Blob" : "this server's disk (data/uploads)";
  return (
    <>
      <PageHeader title="Media library" description={`Photos, certificates and documents. Large photos are resized automatically before upload. Files are stored on ${storage}.`} />
      <MediaLibrary />
    </>
  );
}
