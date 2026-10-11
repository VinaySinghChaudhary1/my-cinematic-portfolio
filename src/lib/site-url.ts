/**
 * The public address of this site. Precedence: Admin → Site settings → Website address, then the SITE_URL
 * environment variable, then http://localhost:3000. Always returned as a bare origin (no path, no trailing slash).
 */
export function normalizeSiteUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function pickSiteUrl(fromSettings: unknown, fromEnv: string | undefined): string {
  return normalizeSiteUrl(fromSettings) ?? normalizeSiteUrl(fromEnv) ?? "http://localhost:3000";
}
