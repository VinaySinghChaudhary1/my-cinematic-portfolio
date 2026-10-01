import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";

const body = z.object({ ids: z.array(z.string().max(60)).max(1000) });

export const POST = route<{ key: string }>(async (req, { params }) => {
  await requireAdmin();
  const { key } = await params;
  const { ids } = body.parse(await readJson(req));
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(schema.items).set({ sortOrder: i }).where(and(eq(schema.items.id, ids[i]), eq(schema.items.sectionKey, key)));
    }
  });
  return json({ ok: true });
});
