import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { NotFound } from "@/lib/server/errors";
import { getSectionType } from "@/lib/registry";
import { schemaFromFields } from "@/lib/validation";

const body = z.object({
  title: z.string().trim().min(1, "Title is required").max(80).optional(),
  subtitle: z.string().trim().max(200).optional(),
  enabled: z.boolean().optional(),
  showInNav: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const PATCH = route<{ key: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { key } = await params;
  const [row] = await db.select().from(schema.sections).where(eq(schema.sections.key, key)).limit(1);
  if (!row) throw NotFound("Section");
  const def = getSectionType(row.type);
  if (!def) throw NotFound("Section type");
  const v = body.parse(await readJson(req));
  const update: Partial<typeof schema.sections.$inferInsert> = { updatedAt: Date.now() };
  if (v.title !== undefined) update.title = v.title;
  if (v.subtitle !== undefined) update.subtitle = v.subtitle;
  if (v.enabled !== undefined) update.enabled = v.enabled;
  if (v.showInNav !== undefined) update.showInNav = v.showInNav;
  if (v.config !== undefined) update.config = JSON.stringify(schemaFromFields(def.configFields).parse(v.config));
  await db.update(schema.sections).set(update).where(eq(schema.sections.key, key));
  await audit(user.id, "section_updated", `${key}${v.enabled !== undefined ? ` enabled=${v.enabled}` : ""}`, clientIp(req));
  return json({ ok: true });
});
