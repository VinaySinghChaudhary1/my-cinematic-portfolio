import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/server/auth";
import { signScoped } from "@/lib/server/session";
import { googleAuthorizeUrl, googleConfigured, newOAuthState, OAUTH_COOKIE, type OAuthIntent } from "@/lib/server/google";
import { rateLimit } from "@/lib/server/rate-limit";
import { clientIp } from "@/lib/server/http";
import { safeAdminReturnPath } from "@/lib/validation";
import { ensureSchema } from "@/db";

/** Starts "Continue with Google". ?intent=admin (sign in to the admin) · link (connect Google to your admin account) · tester */
export async function GET(req: NextRequest) {
  await ensureSchema();
  const back = (path: string) => NextResponse.redirect(new URL(path, req.url));
  const sp = req.nextUrl.searchParams;
  const intent = (["admin", "link", "tester"].includes(sp.get("intent") ?? "") ? sp.get("intent") : "admin") as OAuthIntent;
  const fail = intent === "tester" ? "/beta?error=" : intent === "link" ? "/admin/account?google=" : "/admin/login?error=";
  if (!googleConfigured()) return back(`${fail}google_off`);
  try {
    await rateLimit(`oauth:${clientIp(req)}`, 20, 15 * 60_000);
  } catch {
    return back(`${fail}rate`);
  }
  if (intent === "link" && !(await getCurrentUser())) return back("/admin/login");
  const s = newOAuthState();
  const next = intent === "admin" ? safeAdminReturnPath(sp.get("next") ?? "/admin") : intent === "link" ? "/admin/account" : "/";
  const cookie = await signScoped("oauth", "portfolio-oauth", 600, { state: s.state, nonce: s.nonce, verifier: s.verifier, intent, next });
  const proto = (await headers()).get("x-forwarded-proto");
  (await cookies()).set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax", // must survive the top-level redirect back from Google
    secure: proto ? proto === "https" : req.nextUrl.protocol === "https:",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return NextResponse.redirect(googleAuthorizeUrl(s));
}
