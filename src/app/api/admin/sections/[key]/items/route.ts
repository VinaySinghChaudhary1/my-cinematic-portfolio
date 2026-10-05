import { z } from "zod";
import { eq, max } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { HttpError, NotFound } from "@/lib/server/errors";
import { getSectionType } from "@/lib/registry";
import { schemaFromFields, slugify } from "@/lib/validation";
import { newId } from "@/lib/server/ids";

const body = z.object({
  data: z.record(z.string(), z.unknown()),
  visible: z.boolean().optional(),
  featured: z.boolean().optional(),
  status: z.enum(["published", "draft"]).optional(),
  publishAt: z.number().int().positive().nullable().optional(),
});

export const POST = route<{ key: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { key } = await params;
  const [section] = await db.select().from(schema.sections).where(eq(schema.sections.key, key)).limit(1);
  if (!section) throw NotFound("Section");
  const def = getSectionType(section.type);
  if (!def?.itemFields) throw new HttpError(400, "This section has no items.", "no_items");
  const v = body.parse(await readJson(req));
  const data = schemaFromFields(def.itemFields).parse(v.data) as Record<string, unknown>;
  if (section.type === "projects") data.slug = slugify(String(data.slug || data.title || "")) || newId().slice(0, 8);
  const [{ m }] = await db.select({ m: max(schema.items.sortOrder) }).from(schema.items).where(eq(schema.items.sectionKey, key));
  const t = Date.now();
  const id = newId();
  await db.insert(schema.items).values({
    id,
    sectionKey: key,
    data: JSON.stringify(data),
    visible: v.visible ?? true,
    featured: v.featured ?? false,
    status: v.status ?? "published",
    publishAt: v.publishAt ?? null,
    sortOrder: (m ?? -1) + 1,
    createdAt: t,
    updatedAt: t,
  });
  await audit(user.id, "item_created", `${key}/${id}`, clientIp(req));
  return json({ ok: true, id }, { status: 201 });
});
