import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";

/** Unlinks the Google account from the admin (password sign-in keeps working). */
export const DELETE = route(async (req) => {
  const user = await requireAdmin();
  await db.update(schema.users).set({ googleSub: null, googleEmail: null }).where(eq(schema.users.id, user.id));
  await audit(user.id, "google_unlinked", "", clientIp(req));
  return json({ ok: true });
});
