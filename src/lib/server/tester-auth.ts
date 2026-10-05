/**
 * Beta-tester sessions. Completely separate from the admin session:
 *   own cookie (pf_beta), own JWT audience, own table → a tester can never reach /admin or admin APIs.
 */
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema, ensureSchema } from "@/db";
import type { TesterRow } from "@/db/schema";
import { signScoped, verifyScoped } from "./session";

export const TESTER_COOKIE = "pf_beta";
const AUD = "portfolio-beta";
const MAX_TTL_S = 7 * 24 * 3600;
const DUMMY_HASH = "$2b$12$yFLpV057XJrIysO6H0w3xOSlzjKeCarsSi6xltITQmbntrlaSfGPy";

export function testerStatus(t: Pick<TesterRow, "revokedAt" | "expiresAt">, now = Date.now()): "active" | "expired" | "revoked" {
  if (t.revokedAt) return "revoked";
  if (t.expiresAt && t.expiresAt <= now) return "expired";
  return "active";
}

export async function findTesterByLogin(login: string): Promise<TesterRow | null> {
  const v = login.trim().toLowerCase();
  if (!v) return null;
  const rows = await db.select().from(schema.testers);
  return rows.find((t) => t.username === v || (!!t.email && t.email.toLowerCase() === v)) ?? null;
}

/** Same timing whether or not the tester exists; counts failures and locks for 15 min after 8. */
export async function verifyTesterCredentials(login: string, password: string): Promise<TesterRow | null> {
  const t = await findTesterByLogin(login);
  const ok = await bcrypt.compare(password, t?.passwordHash ?? DUMMY_HASH);
  if (!t || testerStatus(t) !== "active") return null;
  if (t.lockedUntil && t.lockedUntil > Date.now()) return null;
  if (!ok) {
    const failed = t.failedAttempts + 1;
    await db.update(schema.testers).set({ failedAttempts: failed, lockedUntil: failed >= 8 ? Date.now() + 15 * 60_000 : null }).where(eq(schema.testers.id, t.id));
    return null;
  }
  await db.update(schema.testers).set({ failedAttempts: 0, lockedUntil: null, lastSeenAt: Date.now() }).where(eq(schema.testers.id, t.id));
  return t;
}

async function secure() {
  const proto = (await headers()).get("x-forwarded-proto");
  return proto ? proto === "https" : (process.env.SITE_URL ?? "").startsWith("https://");
}

export async function startTesterSession(t: TesterRow) {
  const left = t.expiresAt ? Math.floor((t.expiresAt - Date.now()) / 1000) : MAX_TTL_S;
  const ttl = Math.max(60, Math.min(MAX_TTL_S, left));
  const token = await signScoped(t.id, AUD, ttl, { sv: t.sessionVersion });
  (await cookies()).set(TESTER_COOKIE, token, { httpOnly: true, secure: await secure(), sameSite: "lax", path: "/", maxAge: ttl });
}

export async function endTesterSession() {
  (await cookies()).set(TESTER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
}

/** The signed-in, still-valid tester for this request, or null. */
export async function getCurrentTester(): Promise<TesterRow | null> {
  const token = (await cookies()).get(TESTER_COOKIE)?.value;
  const p = await verifyScoped(token, AUD);
  if (!p) return null;
  await ensureSchema();
  const [t] = await db.select().from(schema.testers).where(eq(schema.testers.id, p.sub)).limit(1);
  if (!t || t.sessionVersion !== p.sv || testerStatus(t) !== "active") return null;
  if (!t.lastSeenAt || Date.now() - t.lastSeenAt > 5 * 60_000) {
    await db.update(schema.testers).set({ lastSeenAt: Date.now() }).where(eq(schema.testers.id, t.id)).catch(() => {});
  }
  return t;
}
