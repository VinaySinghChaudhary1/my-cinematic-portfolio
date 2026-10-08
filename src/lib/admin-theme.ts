/** Admin panel colour theme. Stored per browser in a cookie so the server can render it on first paint. */
export const ADMIN_THEMES = ["light", "dark", "system"] as const;
export type AdminTheme = (typeof ADMIN_THEMES)[number];
export const ADMIN_THEME_COOKIE = "pf_admin_theme";
export const DEFAULT_ADMIN_THEME: AdminTheme = "dark";

export function parseAdminTheme(v: string | undefined | null): AdminTheme {
  return (ADMIN_THEMES as readonly string[]).includes(v ?? "") ? (v as AdminTheme) : DEFAULT_ADMIN_THEME;
}
