import { route, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { alertAddress, sendEmail, siteUrl } from "@/lib/server/email";
import { HttpError } from "@/lib/server/errors";

/** Sends a test email to the alert address so you can confirm Resend + DNS are working. */
export const POST = route(async () => {
  const user = await requireAdmin();
  await rateLimit(`email-test:${user.id}`, 5, 60 * 60_000);
  const to = (await alertAddress()) || user.email;
  const r = await sendEmail({
    to,
    subject: "Test email from your portfolio",
    text: "Email is working. New-message alerts, password resets and tester invites will arrive like this one.",
    action: { label: "Open admin", url: `${siteUrl()}/admin` },
  });
  if (!r.ok) throw new HttpError(r.skipped ? 400 : 502, r.error, "email_failed");
  return json({ ok: true, to });
});
