/**
 * First-start bootstrap for hosts where you can't run `npm run setup` (Docker, Hostinger, Render, Railway…):
 *   - creates the database tables
 *   - adds the demo content if the site is empty
 *   - creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if there is no admin yet
 * Safe to run on every start: it only fills what's missing and never overwrites anything.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db, schema, ensureSchema } from "@/db";
import { DEMO_SECTIONS, DEMO_SETTINGS } from "@/db/seed-data";
import { getSectionType } from "@/lib/registry";
import { passwordSchema } from "@/lib/validation";

export async function bootstrap() {
  await ensureSchema();
  const t = Date.now();

  const existing = await db.select({ key: schema.sections.key }).from(schema.sections).limit(1);
  if (existing.length === 0 && process.env.SEED_DEMO_CONTENT !== "false") {
    let order = 0;
    for (const s of DEMO_SECTIONS) {
      const def = getSectionType(s.type);
      if (!def) continue;
      await db.insert(schema.sections).values({ key: s.key, type: s.type, title: s.title, subtitle: s.subtitle, enabled: true, showInNav: s.type !== "hero", sortOrder: order++, config: JSON.stringify({ ...def.defaultConfig, ...(s.config ?? {}) }), updatedAt: t }).onConflictDoNothing();
      let i = 0;
      for (const data of s.items ?? []) {
        await db.insert(schema.items).values({ id: crypto.randomUUID(), sectionKey: s.key, data: JSON.stringify(data), visible: true, featured: (s.featured ?? []).includes(i), sortOrder: i, createdAt: t + i, updatedAt: t + i });
        i++;
      }
    }
    for (const [k, v] of Object.entries(DEMO_SETTINGS)) await db.insert(schema.settings).values({ key: k, value: JSON.stringify(v), updatedAt: t }).onConflictDoNothing();
    console.log("[bootstrap] empty site — demo content added");
  }

  const users = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (users.length === 0) {
    const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || "";
    if (!email || !passwordSchema.safeParse(password).success) {
      console.warn("[bootstrap] no admin account yet — set ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ chars, upper, lower, digit) and restart.");
      return;
    }
    await db.insert(schema.users).values({ id: crypto.randomUUID(), email, name: "Admin", passwordHash: await bcrypt.hash(password, 12), createdAt: t }).onConflictDoNothing();
    console.log(`[bootstrap] admin account created for ${email} — change the password after first login`);
  }
}
