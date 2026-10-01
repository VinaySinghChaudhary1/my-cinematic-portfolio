import { PageHeader } from "@/components/admin/ui";
import { MessagesInbox } from "@/components/admin/MessagesInbox";

export default function MessagesPage() {
  return (
    <>
      <PageHeader title="Messages" description="Messages sent through your contact form. Reply opens your email app." />
      <MessagesInbox />
    </>
  );
}
