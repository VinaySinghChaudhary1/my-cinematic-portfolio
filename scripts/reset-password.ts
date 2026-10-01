/**
 * Offline password recovery (no email service needed):
 *   npm run admin:reset-password -- you@example.com "NewStrongPassword123"
 * Must be run by someone with access to the server / database credentials.
 * Also signs out every existing session for that account.
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local"), quiet: true });
loadEnv({ path: path.join(process.cwd(), ".env"), quiet: true });

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run admin:reset-password -- <email> "<new password>"');
    process.exit(1);
  }
  const { db, schema, ensureSchema } = await import("../src/db/index");
  const { passwordSchema } = await import("../src/lib/validation");
  const { eq, sql } = await import("drizzle-orm");
  const bcrypt = (await import("bcryptjs")).default;
  const check = passwordSchema.safeParse(password);
  if (!check.success) {
    console.error("✖", check.error.issues[0]?.message);
    process.exit(1);
  }
  await ensureSchema();
  const res = await db
    .update(schema.users)
    .set({
      passwordHash: await bcrypt.hash(password, 12),
      sessionVersion: sql`${schema.users.sessionVersion} + 1`,
      failedAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(schema.users.email, email.toLowerCase().trim()));
  if (res.rowsAffected === 0) {
    console.error("✖ No admin with that email.");
    process.exit(1);
  }
  console.log("✔ Password updated and all sessions signed out.");
}
main();
