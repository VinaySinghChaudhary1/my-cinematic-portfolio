/** Fire-and-forget email notifications to the site owner. Called inside `after()` so visitors never wait. */
import { getSettings } from "../content";
import { alertAddress, sendEmail, siteUrl } from "../email";

export async function notifyNewMessage(m: { name: string; email: string; subject: string; body: string }) {
  const s = await getSettings();
  if (!s.notifications.messageAlerts) return;
  const to = await alertAddress();
  if (!to) return;
  const lines = [`${m.name} <${m.email}> wrote via your website.`, m.subject ? `Subject: ${m.subject}` : ""];
  if (s.notifications.includeMessage) lines.push(`Message:\n${m.body}`);
  lines.push("Reply to this email to answer them directly.");
  await sendEmail({
    to,
    subject: `New message from ${m.name}${m.subject ? ` — ${m.subject}` : ""}`.slice(0, 150),
    text: lines.filter(Boolean).join("\n\n"),
    replyTo: m.email,
    action: { label: "Open inbox", url: `${siteUrl()}/admin/messages` },
  });
}

export async function notifyFeedback(f: { tester: string; page: string; body: string }) {
  const s = await getSettings();
  if (!s.notifications.feedbackAlerts) return;
  const to = await alertAddress();
  if (!to) return;
  await sendEmail({
    to,
    subject: `Beta feedback from ${f.tester}`,
    text: `${f.tester} sent feedback${f.page ? ` from ${f.page}` : ""}:\n\n${f.body}`,
    action: { label: "Open inbox", url: `${siteUrl()}/admin/messages` },
  });
}
