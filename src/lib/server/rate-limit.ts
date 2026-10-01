import { eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { TooMany } from "./errors";

/**
 * Fixed-window limiter stored in the database, so it works across serverless instances.
 * Returns remaining attempts; throws 429 when exceeded.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<number> {
  const t = Date.now();
  const [row] = await db.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, key)).limit(1);
  if (!row || row.resetAt <= t) {
    await db
      .insert(schema.rateLimits)
      .values({ key, count: 1, resetAt: t + windowMs })
      .onConflictDoUpdate({ target: schema.rateLimits.key, set: { count: 1, resetAt: t + windowMs } });
    // opportunistic cleanup of old windows
    if (Math.random() < 0.05) await db.delete(schema.rateLimits).where(lt(schema.rateLimits.resetAt, t));
    return limit - 1;
  }
  if (row.count >= limit) throw TooMany((row.resetAt - t) / 1000);
  await db.update(schema.rateLimits).set({ count: row.count + 1 }).where(eq(schema.rateLimits.key, key));
  return limit - row.count - 1;
}

export async function resetRateLimit(key: string) {
  await db.delete(schema.rateLimits).where(eq(schema.rateLimits.key, key));
}
