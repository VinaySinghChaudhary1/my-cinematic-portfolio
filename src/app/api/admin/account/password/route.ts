import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, hashPassword, startSession, audit } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { HttpError } from "@/lib/server/errors";
import { passwordSchema } from "@/lib/validation";

const body = z
  .object({ currentPassword: z.string().max(200), newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`pw-change:${user.id}`, 5, 15 * 60_000);
  const v = body.parse(await readJson(req, 10_000));
  if (!(await bcrypt.compare(v.currentPassword, user.passwordHash))) {
    throw new HttpError(400, "Current password is incorrect.", "validation", { currentPassword: "Current password is incorrect" });
  }
  const sessionVersion = user.sessionVersion + 1; // signs out all other devices
  await db.update(schema.users).set({ passwordHash: await hashPassword(v.newPassword), sessionVersion }).where(eq(schema.users.id, user.id));
  await startSession({ ...user, sessionVersion });
  await audit(user.id, "password_changed", "", clientIp(req));
  return json({ ok: true });
});
