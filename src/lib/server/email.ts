/**
 * Outgoing email via Resend's REST API (no SDK).
 *   RESEND_API_KEY   required to send (without it emails are logged and skipped — fine for local dev)
 *   EMAIL_FROM       optional, e.g. "Vinay Singh Chaudhary <noreply@vinaysinghchaudhary.me>"
 * The domain in EMAIL_FROM must be verified in Resend (DNS records), otherwise Resend refuses the send.
 */
import { getSettings } from "./content";

export interface EmailInput {
  to: string | string[];
  subject: string;
  /** Plain-text body. HTML is generated from it with the site's simple branded template. */
  text: string;
  replyTo?: string;
  /** Optional call-to-action button. */
  action?: { label: string; url: string };
}
export type EmailResult = { ok: true; id: string } | { ok: false; skipped?: boolean; error: string };

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

async function fromAddress(): Promise<string> {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  let host = "localhost";
  try {
    host = new URL(siteUrl()).hostname.replace(/^www\./, "");
  } catch {
    /* default */
  }
  const name = (await getSettings()).profile.name || "Portfolio";
  return `${name.replace(/[<>"]/g, "")} <noreply@${host}>`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderEmailHtml(i: Pick<EmailInput, "subject" | "text" | "action">, siteName: string): string {
  const paras = i.text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = i.action
    ? `<p style="margin:22px 0"><a href="${esc(i.action.url)}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600">${esc(i.action.label)}</a></p><p style="margin:0 0 14px;font-size:12px;color:#6b7280">If the button doesn't work, copy this link:<br>${esc(i.action.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f3ff;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#1f1147">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;border:1px solid #e9e5ff">
<div style="font-size:12px;letter-spacing:.14em;color:#7c3aed;font-weight:700;margin-bottom:10px">${esc(siteName.toUpperCase())}</div>
<h1 style="font-size:20px;margin:0 0 16px">${esc(i.subject)}</h1>${paras}${button}
</div><p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:14px">${esc(siteUrl())}</p></body></html>`;
}

/** Sends an email. Never throws — returns a result the caller can show or log. */
export async function sendEmail(i: EmailInput): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const siteName = (await getSettings()).profile.name || "Portfolio";
  if (!key) {
    console.info(`[email] RESEND_API_KEY not set — skipped "${i.subject}" to ${[i.to].flat().join(", ")}`);
    return { ok: false, skipped: true, error: "Email is not set up yet (RESEND_API_KEY missing)." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: await fromAddress(),
        to: [i.to].flat(),
        subject: i.subject.slice(0, 200),
        text: i.action ? `${i.text}\n\n${i.action.label}: ${i.action.url}` : i.text,
        html: renderEmailHtml(i, siteName),
        ...(i.replyTo ? { reply_to: i.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      const msg = String(body.message || body.name || `HTTP ${res.status}`).slice(0, 300);
      console.error("[email] send failed", res.status, msg);
      return { ok: false, error: `The email service refused the message: ${msg}` };
    }
    return { ok: true, id: String(body.id ?? "") };
  } catch (e) {
    console.error("[email] send error", e);
    return { ok: false, error: "Couldn't reach the email service. Try again later." };
  }
}

/** Where notifications go: Settings → Notifications → alert email, falling back to the public profile email. */
export async function alertAddress(): Promise<string> {
  const s = await getSettings();
  return (s.notifications.alertEmail || s.profile.email || "").trim();
}
