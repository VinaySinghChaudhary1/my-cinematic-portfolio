import { z } from "zod";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { audit } from "@/lib/server/auth";
import { createResetToken, RESET_TTL_MS } from "@/lib/server/tokens";
import { findTesterByLogin, testerStatus } from "@/lib/server/tester-auth";
import { sendEmail, siteUrl } from "@/lib/server/email";

const body = z.object({ email: z.string().trim().max(200), kind: z.enum(["admin", "tester"]).default("admin") });

/**
 * Always answers the same way (no account enumeration). If the account exists, a one-time link
 * valid for 30 minutes is emailed. The email is sent after the response, so timing reveals nothing.
 */
export const POST = route(async (req) => {
  const ip = clientIp(req);
  const v = body.parse(await readJson(req, 5_000));
  const login = v.email.toLowerCase();
  await rateLimit(`forgot-ip:${ip}`, 8, 15 * 60_000);
  await rateLimit(`forgot:${login}`, 3, 60 * 60_000);

  after(async () => {
    try {
      let to = "";
      let token = "";
      if (v.kind === "admin") {
        const [u] = await db.select().from(schema.users).where(eq(schema.users.email, login)).limit(1);
        if (u) {
          to = u.email;
          token = await createResetToken("admin", u.id);
          await audit(u.id, "password_reset_requested", "", ip);
        }
      } else {
        const t = await findTesterByLogin(login);
        if (t && t.email && testerStatus(t) === "active") {
          to = t.email;
          token = await createResetToken("tester", t.id);
          await audit(null, "tester_reset_requested", t.username, ip);
        }
      }
      if (!to) return;
      await sendEmail({
        to,
        subject: "Reset your password",
        text: `Someone (hopefully you) asked to reset the password for ${to}.\n\nThe link works once and expires in ${RESET_TTL_MS / 60_000} minutes. If you didn't ask for this, ignore this email — your password stays the same.`,
        action: { label: "Choose a new password", url: `${siteUrl()}/auth/reset?token=${token}` },
      });
    } catch (e) {
      console.error("[forgot] failed", e);
    }
  });
  return json({ ok: true, message: "If that account exists, we've emailed a reset link. Check your inbox (and spam)." });
});
