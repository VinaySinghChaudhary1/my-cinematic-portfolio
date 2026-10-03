import { PageHeader } from "@/components/admin/ui";
import { AiSettings } from "@/components/admin/ai/AiSettings";

export const metadata = { title: "AI assistant" };

export default function AiPage() {
  return (
    <>
      <PageHeader title="AI assistant" description="Connect Claude, Gemini or OpenAI with your own API key to fill forms, write and polish text, and generate logos, icons and covers that match your site." />
      <AiSettings />
    </>
  );
}
