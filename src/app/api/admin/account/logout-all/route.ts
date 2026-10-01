import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, clientIp } from "@/lib/server/http";
import { requireAdmin, endSession, audit } from "@/lib/server/auth";

export const POST = route(async (req) => {
  const user = await requireAdmin();
  await db.update(schema.users).set({ sessionVersion: user.sessionVersion + 1 }).where(eq(schema.users.id, user.id));
  await endSession();
  await audit(user.id, "logout_all", "", clientIp(req));
  return json({ ok: true });
});
