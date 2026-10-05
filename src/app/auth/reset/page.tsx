import Link from "next/link";
import { getSettings } from "@/lib/server/content";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";
import { peekResetToken } from "@/lib/server/tokens";
import { ensureSchema } from "@/db";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await ensureSchema();
  const token = String((await searchParams).token ?? "");
  const s = await getSettings();
  const valid = await peekResetToken(token);
  return (
    <AuthShell badge={s.profile.initials || "A"} title="Choose a new password">
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div role="alert" className="space-y-3 rounded-3xl border border-line bg-bg-2/80 p-6 text-sm text-muted md:p-8">
          <p className="font-medium text-ink">This link is invalid or has expired.</p>
          <p>Reset links work once and expire after 30 minutes.</p>
          <Link href="/auth/forgot" className="block rounded-xl bg-accent px-4 py-3 text-center font-medium text-white">
            Ask for a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
