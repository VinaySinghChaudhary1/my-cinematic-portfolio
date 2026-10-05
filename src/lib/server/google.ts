/**
 * "Continue with Google" — OpenID Connect authorization-code flow with PKCE, state and nonce.
 * No SDK: the ID token is verified with `jose` against Google's published keys.
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   (Google Cloud → APIs & Services → Credentials → OAuth client, type "Web application")
 *   Authorized redirect URI: {SITE_URL}/api/auth/google/callback
 * Scopes: openid email profile only (no Google app verification needed).
 */
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { siteUrl } from "./email";

export const OAUTH_COOKIE = "pf_oauth";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const googleRedirectUri = () => `${siteUrl()}/api/auth/google/callback`;

export type OAuthIntent = "admin" | "link" | "tester";

export function newOAuthState() {
  const b = (n: number) => randomBytes(n).toString("base64url");
  const verifier = b(48);
  return { state: b(24), nonce: b(24), verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export function googleAuthorizeUrl(p: { state: string; nonce: string; challenge: string; loginHint?: string }) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    ...(p.loginHint ? { login_hint: p.loginHint } : {}),
  }).toString();
  return u.toString();
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

export async function exchangeGoogleCode(code: string, verifier: string, nonce: string): Promise<GoogleIdentity> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!res.ok || !j.id_token) throw new Error(`google_token:${j.error ?? res.status}`);
  const { payload } = await jwtVerify(j.id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== nonce) throw new Error("google_nonce");
  if (payload.email_verified !== true || typeof payload.email !== "string") throw new Error("google_unverified");
  return { sub: String(payload.sub), email: payload.email.toLowerCase(), name: String(payload.name ?? "") };
}
