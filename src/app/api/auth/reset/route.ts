import { z } from "zod";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { audit, hashPassword } from "@/lib/server/auth";
import { consumeToken, peekResetToken } from "@/lib/server/tokens";
import { HttpError } from "@/lib/server/errors";
import { passwordSchema } from "@/lib/validation";
import { sendEmail, siteUrl } from "@/lib/server/email";

const body = z
  .object({ token: z.string().max(200), password: passwordSchema, confirmPassword: z.string().max(200) })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

/** Sets a new password from a reset link, then signs the account out everywhere. */
export const POST = route(async (req) => {
  const ip = clientIp(req);
  await rateLimit(`reset:${ip}`, 10, 15 * 60_000);
  const v = body.parse(await readJson(req, 5_000));
  const tok = await peekResetToken(v.token);
  if (!tok) throw new HttpError(400, "This reset link is invalid or has expired. Ask for a new one.", "invalid_token");
  const hash = await hashPassword(v.password);
  if (!(await consumeToken(tok.id))) throw new HttpError(400, "This reset link was already used.", "invalid_token");

  let to = "";
  let loginUrl = `${siteUrl()}/admin/login`;
  if (tok.kind === "admin") {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, tok.subjectId)).limit(1);
    if (!u) throw new HttpError(400, "This account no longer exists.", "invalid_token");
    await db.update(schema.users).set({ passwordHash: hash, sessionVersion: u.sessionVersion + 1, failedAttempts: 0, lockedUntil: null }).where(eq(schema.users.id, u.id));
    await audit(u.id, "password_reset", "", ip);
    to = u.email;
  } else {
    const [t] = await db.select().from(schema.testers).where(eq(schema.testers.id, tok.subjectId)).limit(1);
    if (!t) throw new HttpError(400, "This account no longer exists.", "invalid_token");
    await db.update(schema.testers).set({ passwordHash: hash, sessionVersion: t.sessionVersion + 1, failedAttempts: 0, lockedUntil: null }).where(eq(schema.testers.id, t.id));
    await audit(null, "tester_password_reset", t.username, ip);
    to = t.email;
    loginUrl = `${siteUrl()}/beta`;
  }
  if (to)
    after(() =>
      sendEmail({
        to,
        subject: "Your password was changed",
        text: "Your password was just changed and all devices were signed out.\n\nIf this wasn't you, reset it again immediately and contact the site owner.",
        action: { label: "Sign in", url: loginUrl },
      }).then(() => undefined),
    );
  return json({ ok: true, kind: tok.kind });
});
