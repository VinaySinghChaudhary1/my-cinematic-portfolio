import { redirect } from "next/navigation";
import { getSettings } from "@/lib/server/content";
import { getCurrentTester } from "@/lib/server/tester-auth";
import { googleConfigured } from "@/lib/server/google";
import { AuthShell, AUTH_ERRORS } from "@/components/auth/AuthShell";
import { TesterLoginForm } from "@/components/auth/TesterLoginForm";

export const metadata = { title: "Beta preview sign in", robots: { index: false, follow: false } };

export default async function BetaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentTester()) redirect("/");
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <AuthShell badge={s.profile.initials || "β"} title="Beta preview" subtitle={`Sign in with the details ${s.profile.name || "the owner"} sent you.`}>
      <TesterLoginForm google={googleConfigured()} notice={sp.error ? AUTH_ERRORS[sp.error] : undefined} />
    </AuthShell>
  );
}
