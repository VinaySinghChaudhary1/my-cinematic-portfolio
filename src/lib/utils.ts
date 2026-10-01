import clsx, { type ClassValue } from "clsx";

export const cn = (...c: ClassValue[]) => clsx(c);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-03" | "2025-03-14" → "Mar 2025" */
export function formatMonth(v: unknown): string {
  if (typeof v !== "string" || !v) return "";
  const [y, m] = v.split("-");
  const mi = Number(m) - 1;
  return mi >= 0 && mi < 12 ? `${MONTHS[mi]} ${y}` : y;
}

export function formatRange(start: unknown, end: unknown, presentLabel = "Present"): string {
  const s = formatMonth(start);
  const e = formatMonth(end);
  if (!s && !e) return "";
  if (s && !e) return `${s} — ${presentLabel}`;
  if (!s) return e;
  return `${s} — ${e}`;
}

export const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
export const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x) : []);
export const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || d);

export function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

export function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.hostname.includes("youtube.com")) id = u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? "";
    return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
