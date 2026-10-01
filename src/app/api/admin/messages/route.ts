import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)).limit(500);
  return json({ ok: true, messages: rows });
});
