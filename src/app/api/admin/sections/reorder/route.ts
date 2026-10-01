import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";

const body = z.object({ keys: z.array(z.string().max(60)).max(100) });

export const POST = route(async (req) => {
  await requireAdmin();
  const { keys } = body.parse(await readJson(req));
  await db.transaction(async (tx) => {
    for (let i = 0; i < keys.length; i++) {
      await tx.update(schema.sections).set({ sortOrder: i }).where(eq(schema.sections.key, keys[i]));
    }
  });
  return json({ ok: true });
});
