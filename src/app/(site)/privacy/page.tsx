import { notFound } from "next/navigation";
import { getSettings } from "@/lib/server/content";
import { Markdown } from "@/components/ui/Markdown";
import { formatMonth } from "@/lib/utils";

export const metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const s = await getSettings();
  // Only shown once the owner has written and published real content (no placeholder legal text in public).
  if (!s.privacy.published || !s.privacy.content.trim()) notFound();
  return (
    <div className="relative z-10 pt-36 pb-24">
      <div className="container-x max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 font-display text-5xl font-semibold text-ink">Privacy notice</h1>
        {s.privacy.effectiveDate && <p className="mt-3 text-sm text-faint">Effective {formatMonth(s.privacy.effectiveDate)}</p>}
        <Markdown className="prose-dark mt-10">{s.privacy.content}</Markdown>
      </div>
    </div>
  );
}
