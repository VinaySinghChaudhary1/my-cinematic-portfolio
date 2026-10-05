import { getSettings } from "@/lib/server/content";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { emailConfigured } from "@/lib/server/email";

export const metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const kind = (await searchParams).kind === "tester" ? "tester" : "admin";
  const s = await getSettings();
  return (
    <AuthShell badge={s.profile.initials || "A"} title="Forgot your password?" subtitle="We'll email you a link to choose a new one." back={{ href: kind === "tester" ? "/beta" : "/admin/login", label: "← Back to sign in" }}>
      {!emailConfigured() && (
        <p className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2.5 text-sm text-warn">
          Email isn&apos;t set up on this site yet, so no link can be sent. {kind === "admin" ? <>Use <code>npm run admin:reset-password</code> instead.</> : "Ask the site owner to reset your password."}
        </p>
      )}
      <ForgotForm kind={kind} />
    </AuthShell>
  );
}
