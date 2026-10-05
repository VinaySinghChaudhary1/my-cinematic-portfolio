"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Link2Off, Mail, Send } from "lucide-react";
import { api } from "./api";
import { Button, Card } from "./ui";
import { GoogleButton } from "@/components/auth/AuthShell";

const GOOGLE_MSG: Record<string, [string, "success" | "error"]> = {
  linked: ["Google account linked — you can now use “Continue with Google”.", "success"],
  taken: ["That Google account is already linked to another admin.", "error"],
  google_cancelled: ["Linking was cancelled.", "error"],
  google_failed: ["Google sign-in failed. Try again.", "error"],
  google_state: ["Linking timed out. Try again.", "error"],
  google_off: ["Google sign-in isn't configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).", "error"],
};

export function AccountExtras({ google, email, notice }: { google: { configured: boolean; linkedEmail: string | null }; email: { configured: boolean; alertTo: string; from: string }; notice?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  useEffect(() => {
    if (!notice || !GOOGLE_MSG[notice]) return;
    const [m, kind] = GOOGLE_MSG[notice];
    if (kind === "success") toast.success(m);
    else toast.error(m);
    window.history.replaceState(null, "", "/admin/account");
  }, [notice]);
  async function unlink() {
    if (!confirm("Unlink your Google account? You'll sign in with email and password only.")) return;
    setBusy("unlink");
    try {
      await api("/api/admin/account/google", { method: "DELETE" });
      toast.success("Google account unlinked");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not unlink");
    } finally {
      setBusy("");
    }
  }
  async function testEmail() {
    setBusy("email");
    try {
      const r = await api<{ to: string }>("/api/admin/notifications/test", { method: "POST" });
      toast.success(`Test email sent to ${r.to}. Check your inbox (and spam).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test email failed", { duration: 10000 });
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Link2 className="size-5 text-accent-2" aria-hidden /> Sign in with Google
        </h2>
        {!google.configured ? (
          <p className="mt-2 text-sm text-muted">Not set up yet. Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> on the server (see docs/EMAIL-AND-ACCESS.md), redeploy, then link your account here.</p>
        ) : google.linkedEmail ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Linked to <strong className="text-ink">{google.linkedEmail}</strong>. On the sign-in page, “Continue with Google” opens the admin with this account.
            </p>
            <Button variant="outline" className="mt-4" onClick={unlink} loading={busy === "unlink"}>
              <Link2Off className="size-4" aria-hidden /> Unlink
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 mb-4 text-sm text-muted">Link your Google account once; afterwards you can sign in with one click. Only the account you link here gets admin access.</p>
            <GoogleButton href="/api/auth/google/start?intent=link" label="Link my Google account" />
          </>
        )}
      </Card>
      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Mail className="size-5 text-accent-2" aria-hidden /> Email
        </h2>
        {email.configured ? (
          <p className="mt-2 text-sm text-muted">
            Sending from <code>{email.from}</code>. Alerts go to <strong className="text-ink">{email.alertTo || "— (set one in Settings → Notifications)"}</strong>.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Not set up yet — password-reset links, message alerts and tester invites can&apos;t be emailed. Add <code>RESEND_API_KEY</code> on the server (see docs/EMAIL-AND-ACCESS.md).</p>
        )}
        <Button variant="outline" className="mt-4" onClick={testEmail} loading={busy === "email"} disabled={!email.configured}>
          <Send className="size-4" aria-hidden /> Send test email
        </Button>
      </Card>
    </div>
  );
}
