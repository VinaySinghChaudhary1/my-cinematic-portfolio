/**
 * A random ID created once per database. Its short hash is published by /api/health so the Domain checker can tell
 * whether a domain opens THIS site or another copy (e.g. the old host). Not part of backups, so a restored copy on a
 * new host gets its own ID.
 */
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const KEY = "instance";
let cached: string | null = null;

export async function siteFingerprint(): Promise<string> {
  if (cached) return cached;
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY)).limit(1);
  let id = row ? (JSON.parse(row.value) as { id?: string }).id : undefined;
  if (!id) {
    id = randomBytes(16).toString("hex");
    await db.insert(schema.settings).values({ key: KEY, value: JSON.stringify({ id }), updatedAt: Date.now() }).onConflictDoNothing();
    const [again] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY)).limit(1);
    id = (JSON.parse(again.value) as { id: string }).id;
  }
  cached = createHash("sha256").update(`site:${id}`).digest("hex").slice(0, 16);
  return cached;
}
