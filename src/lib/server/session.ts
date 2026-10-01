import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "pf_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string;
  sv: number;
  email: string;
}

let warned = false;
function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("AUTH_SECRET must be set (32+ characters) in production");
    }
    if (!warned) {
      console.warn("[auth] AUTH_SECRET missing/short — using an insecure development secret. Run `npm run setup`.");
      warned = true;
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please-0123456789");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ sv: p.sv, email: p.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setIssuer("portfolio")
    .setAudience("portfolio-admin")
    .sign(secretKey());
}

/** Returns null for missing, tampered or expired tokens. Never throws. */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: "portfolio",
      audience: "portfolio-admin",
    });
    if (typeof payload.sub !== "string" || typeof payload.sv !== "number") return null;
    return { sub: payload.sub, sv: payload.sv, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
