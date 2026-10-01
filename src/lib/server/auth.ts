import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema, ensureSchema } from "@/db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";
import { Unauthorized } from "./errors";
import { newId } from "./ids";
import type { UserRow } from "@/db/schema";

export const BCRYPT_ROUNDS = 12;
export const MAX_FAILED_LOGINS = 8;
export const LOCK_MS = 15 * 60 * 1000;

// A real hash so that "unknown email" takes as long as "wrong password" (prevents user enumeration by timing).
const DUMMY_HASH = "$2b$12$yFLpV057XJrIysO6H0w3xOSlzjKeCarsSi6xltITQmbntrlaSfGPy";

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS);

export async function verifyCredentials(email: string, password: string): Promise<UserRow | null> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user) return null;
  if (user.lockedUntil && user.lockedUntil > Date.now()) return null;
  if (!ok) {
    const failed = user.failedAttempts + 1;
    await db
      .update(schema.users)
      .set({ failedAttempts: failed, lockedUntil: failed >= MAX_FAILED_LOGINS ? Date.now() + LOCK_MS : null })
      .where(eq(schema.users.id, user.id));
    return null;
  }
  await db
    .update(schema.users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: Date.now() })
    .where(eq(schema.users.id, user.id));
  return user;
}

async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  if (proto) return proto === "https";
  return (process.env.SITE_URL ?? "").startsWith("https://");
}

export async function startSession(user: UserRow) {
  const token = await signSession({ sub: user.id, sv: user.sessionVersion, email: user.email });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
}

/** Server-side authorization: verifies signature AND that the session hasn't been revoked. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;
  await ensureSchema();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.sub)).limit(1);
  if (!user || user.sessionVersion !== payload.sv) return null;
  return user;
}

export async function requireAdmin(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) throw Unauthorized();
  return user;
}

export async function audit(userId: string | null, action: string, detail = "", ip = "") {
  try {
    await db.insert(schema.auditLog).values({ id: newId(), userId, action, detail: detail.slice(0, 500), ip, createdAt: Date.now() });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
