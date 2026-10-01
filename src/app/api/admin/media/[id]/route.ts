import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { NotFound } from "@/lib/server/errors";
import { deleteStoredFile } from "@/lib/server/storage";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const { alt } = z.object({ alt: z.string().trim().max(300) }).parse(await readJson(req));
  const res = await db.update(schema.media).set({ alt }).where(eq(schema.media.id, id));
  if (res.rowsAffected === 0) throw NotFound("File");
  return json({ ok: true });
});

export const DELETE = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { id } = await params;
  const [row] = await db.select().from(schema.media).where(eq(schema.media.id, id)).limit(1);
  if (!row) throw NotFound("File");
  await db.delete(schema.media).where(eq(schema.media.id, id));
  await deleteStoredFile(row.storageKey);
  await audit(user.id, "media_deleted", row.filename, clientIp(req));
  return json({ ok: true });
});
