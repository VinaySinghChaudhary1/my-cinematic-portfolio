/** Admin-side helpers for beta testers: credentials, invite text, WhatsApp share link, invite email. */
import { randomInt } from "node:crypto";
import { db, schema } from "@/db";
import type { TesterRow } from "@/db/schema";
import { getSettings } from "./content";
import { sendEmail, siteUrl, type EmailResult } from "./email";
import { testerStatus } from "./tester-auth";

const ALPHA = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** e.g. "Kp7m-Qx3r-W9tz" — 12 random characters (≈70 bits), easy to read aloud, always mixed case + digit. */
export function generatePassword(): string {
  for (;;) {
    const raw = Array.from({ length: 12 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
    if (/[a-z]/.test(raw) && /[A-Z]/.test(raw) && /\d/.test(raw)) return raw.match(/.{4}/g)!.join("-");
  }
}

export async function uniqueUsername(base: string): Promise<string> {
  const clean = base.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 24) || "tester";
  const taken = new Set((await db.select({ u: schema.testers.username }).from(schema.testers)).map((r) => r.u));
  if (!taken.has(clean)) return clean;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${clean}${i}`)) return `${clean}${i}`;
  return `${clean}${randomInt(1000, 9999)}`;
}

/** Digits only, with country code (assumes India +91 for 10-digit numbers). */
export function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d;
}

export function publicTester(t: TesterRow) {
  return {
    id: t.id,
    name: t.name,
    username: t.username,
    email: t.email,
    phone: t.phone,
    canSeeDrafts: t.canSeeDrafts,
    note: t.note,
    expiresAt: t.expiresAt,
    revokedAt: t.revokedAt,
    lastSeenAt: t.lastSeenAt,
    googleLinked: !!t.googleSub,
    createdAt: t.createdAt,
    status: testerStatus(t),
  };
}

export async function inviteText(t: TesterRow, password: string) {
  const s = await getSettings();
  const site = s.profile.name ? `${s.profile.name}'s portfolio` : "my portfolio";
  const until = t.expiresAt ? new Date(t.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  return [
    `Hi ${t.name}! You're invited to beta-test ${site} before it goes public.`,
    `Open: ${siteUrl()}/beta`,
    `Username: ${t.username}`,
    `Password: ${password}`,
    until ? `Access until: ${until}.` : "Access: until I end the beta.",
    `Use "Send feedback" at the top of the site to tell me what to fix. Please don't share these details.`,
  ].join("\n");
}

export function whatsappUrl(phone: string, text: string) {
  const n = normalizePhone(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export async function emailInvite(t: TesterRow, password: string): Promise<EmailResult> {
  if (!t.email) return { ok: false, error: "No email address for this tester." };
  const s = await getSettings();
  return sendEmail({
    to: t.email,
    subject: `Your beta access to ${s.profile.name || "the portfolio"}`,
    text: await inviteText(t, password),
    action: { label: "Open the beta", url: `${siteUrl()}/beta` },
  });
}
