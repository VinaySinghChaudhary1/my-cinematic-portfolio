import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { NotFound } from "@/lib/server/errors";
import { getSectionType } from "@/lib/registry";
import { schemaFromFields, slugify } from "@/lib/validation";

const body = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  visible: z.boolean().optional(),
  featured: z.boolean().optional(),
});

async function load(id: string) {
  const [item] = await db.select().from(schema.items).where(eq(schema.items.id, id)).limit(1);
  if (!item) throw NotFound("Item");
  const [section] = await db.select().from(schema.sections).where(eq(schema.sections.key, item.sectionKey)).limit(1);
  if (!section) throw NotFound("Section");
  return { item, section };
}

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { id } = await params;
  const { section } = await load(id);
  const v = body.parse(await readJson(req));
  const update: Partial<typeof schema.items.$inferInsert> = { updatedAt: Date.now() };
  if (v.data) {
    const def = getSectionType(section.type);
    const data = schemaFromFields(def?.itemFields ?? []).parse(v.data) as Record<string, unknown>;
    if (section.type === "projects") data.slug = slugify(String(data.slug || data.title || "")) || id.slice(0, 8);
    update.data = JSON.stringify(data);
  }
  if (v.visible !== undefined) update.visible = v.visible;
  if (v.featured !== undefined) update.featured = v.featured;
  await db.update(schema.items).set(update).where(eq(schema.items.id, id));
  await audit(user.id, "item_updated", `${section.key}/${id}`, clientIp(req));
  return json({ ok: true });
});

export const DELETE = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { id } = await params;
  const { section } = await load(id);
  await db.delete(schema.items).where(eq(schema.items.id, id));
  await audit(user.id, "item_deleted", `${section.key}/${id}`, clientIp(req));
  return json({ ok: true });
});
