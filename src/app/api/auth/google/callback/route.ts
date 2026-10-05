import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { db, schema, ensureSchema } from "@/db";
import { audit, getCurrentUser, startSession } from "@/lib/server/auth";
import { verifyScoped } from "@/lib/server/session";
import { exchangeGoogleCode, OAUTH_COOKIE } from "@/lib/server/google";
import { startTesterSession, testerStatus } from "@/lib/server/tester-auth";
import { clientIp } from "@/lib/server/http";
import { safeAdminReturnPath } from "@/lib/validation";

/**
 * Google redirects here. Order of matching:
 *   intent=link   → attach this Google account to the signed-in admin
 *   linked admin  → admin session (only accounts the admin linked themselves — never by email alone)
 *   tester        → active tester whose linked Google account or invite email matches
 */
export async function GET(req: NextRequest) {
  await ensureSchema();
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  const st = await verifyScoped(raw, "portfolio-oauth");
  const intent = String(st?.intent ?? "admin");
  const failBase = intent === "tester" ? "/beta?error=" : intent === "link" ? "/admin/account?google=" : "/admin/login?error=";
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url));
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return go(`${failBase}google_cancelled`);
  if (!st || !sp.get("code") || sp.get("state") !== st.state) return go(`${failBase}google_state`);

  let id;
  try {
    id = await exchangeGoogleCode(String(sp.get("code")), String(st.verifier), String(st.nonce));
  } catch (e) {
    console.error("[google] sign-in failed", e);
    return go(`${failBase}google_failed`);
  }
  const ip = clientIp(req);

  if (intent === "link") {
    const user = await getCurrentUser();
    if (!user) return go("/admin/login");
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.googleSub, id.sub), ne(schema.users.id, user.id))).limit(1);
    if (taken) return go("/admin/account?google=taken");
    await db.update(schema.users).set({ googleSub: id.sub, googleEmail: id.email }).where(eq(schema.users.id, user.id));
    await audit(user.id, "google_linked", id.email, ip);
    return go("/admin/account?google=linked");
  }

  const [admin] = await db.select().from(schema.users).where(eq(schema.users.googleSub, id.sub)).limit(1);
  if (admin && intent === "admin") {
    if (admin.lockedUntil && admin.lockedUntil > Date.now()) return go("/admin/login?error=locked");
    await db.update(schema.users).set({ lastLoginAt: Date.now(), failedAttempts: 0 }).where(eq(schema.users.id, admin.id));
    await startSession(admin);
    await audit(admin.id, "login_google", id.email, ip);
    return go(safeAdminReturnPath(String(st.next ?? "/admin")));
  }

  const testers = await db.select().from(schema.testers);
  const t = testers.find((x) => x.googleSub === id.sub) ?? testers.find((x) => !x.googleSub && x.email && x.email.toLowerCase() === id.email);
  if (t && testerStatus(t) === "active") {
    if (!t.googleSub) await db.update(schema.testers).set({ googleSub: id.sub }).where(eq(schema.testers.id, t.id));
    await db.update(schema.testers).set({ lastSeenAt: Date.now() }).where(eq(schema.testers.id, t.id));
    await startTesterSession(t);
    await audit(null, "tester_login_google", t.username, ip);
    return go("/");
  }
  if (admin) return go("/admin/login?error=google_admin_use_admin");
  await audit(null, "login_google_denied", id.email, ip);
  return go(`${failBase}google_not_allowed`);
}
