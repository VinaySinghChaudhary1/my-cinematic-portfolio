import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit, hashPassword } from "@/lib/server/auth";
import { NotFound } from "@/lib/server/errors";
import { emailInvite, generatePassword, inviteText, publicTester, whatsappUrl } from "@/lib/server/testers";

/** New password for a tester (old one stops working, open sessions end). Optionally emails the new invite. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { sendEmail } = z.object({ sendEmail: z.boolean().default(true) }).parse(await readJson(req, 1000));
  const [t0] = await db.select().from(schema.testers).where(eq(schema.testers.id, (await params).id)).limit(1);
  if (!t0) throw NotFound("Tester");
  const password = generatePassword();
  await db.update(schema.testers).set({ passwordHash: await hashPassword(password), sessionVersion: t0.sessionVersion + 1, failedAttempts: 0, lockedUntil: null }).where(eq(schema.testers.id, t0.id));
  const [t] = await db.select().from(schema.testers).where(eq(schema.testers.id, t0.id)).limit(1);
  const text = await inviteText(t, password);
  const mail = sendEmail && t.email ? await emailInvite(t, password) : null;
  await audit(user.id, "tester_updated", `${t.username} new password${mail?.ok ? " (emailed)" : ""}`, clientIp(req));
  return json({ ok: true, tester: publicTester(t), password, invite: { text, whatsapp: t.phone ? whatsappUrl(t.phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`, email: mail } });
});
