import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { NotFound } from "@/lib/server/errors";
import { publicTester } from "@/lib/server/testers";
import { testerFields } from "../route";

const patch = z.object({
  name: testerFields.name.optional(),
  email: testerFields.email.optional(),
  phone: testerFields.phone.optional(),
  expiresAt: z.number().int().positive().nullable().optional(),
  canSeeDrafts: z.boolean().optional(),
  note: testerFields.note.optional(),
  revoked: z.boolean().optional(),
});

async function load(id: string) {
  const [t] = await db.select().from(schema.testers).where(eq(schema.testers.id, id)).limit(1);
  if (!t) throw NotFound("Tester");
  return t;
}

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const t = await load((await params).id);
  const v = patch.parse(await readJson(req, 10_000));
  const upd: Partial<typeof schema.testers.$inferInsert> = {};
  if (v.name !== undefined) upd.name = v.name;
  if (v.email !== undefined) upd.email = v.email.toLowerCase();
  if (v.phone !== undefined) upd.phone = v.phone;
  if (v.expiresAt !== undefined) upd.expiresAt = v.expiresAt;
  if (v.canSeeDrafts !== undefined) upd.canSeeDrafts = v.canSeeDrafts;
  if (v.note !== undefined) upd.note = v.note;
  if (v.revoked !== undefined) {
    upd.revokedAt = v.revoked ? Date.now() : null;
    upd.sessionVersion = t.sessionVersion + 1; // ends any open session immediately
  }
  if (v.email !== undefined && v.email.toLowerCase() !== t.email) upd.googleSub = null; // re-link Google to the new email
  await db.update(schema.testers).set(upd).where(eq(schema.testers.id, t.id));
  await audit(user.id, "tester_updated", `${t.username}${v.revoked !== undefined ? (v.revoked ? " revoked" : " restored") : ""}`, clientIp(req));
  return json({ ok: true, tester: publicTester(await load(t.id)) });
});

export const DELETE = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const t = await load((await params).id);
  await db.delete(schema.testers).where(eq(schema.testers.id, t.id));
  await db.delete(schema.authTokens).where(eq(schema.authTokens.subjectId, t.id));
  await audit(user.id, "tester_deleted", t.username, clientIp(req));
  return json({ ok: true });
});
