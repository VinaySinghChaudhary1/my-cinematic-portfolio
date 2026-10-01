import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { NotFound } from "@/lib/server/errors";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const { read } = z.object({ read: z.boolean() }).parse(await readJson(req));
  const res = await db.update(schema.messages).set({ read }).where(eq(schema.messages.id, id));
  if (res.rowsAffected === 0) throw NotFound("Message");
  return json({ ok: true });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const res = await db.delete(schema.messages).where(eq(schema.messages.id, id));
  if (res.rowsAffected === 0) throw NotFound("Message");
  return json({ ok: true });
});
