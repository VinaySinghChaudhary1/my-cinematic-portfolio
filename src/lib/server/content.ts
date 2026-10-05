import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema, ensureSchema } from "@/db";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-def";
import { getSectionType } from "@/lib/registry";
import { slugify } from "@/lib/validation";

export type ItemData = Record<string, unknown>;
export interface PublicItem {
  id: string;
  featured: boolean;
  data: ItemData;
  /** Only in preview mode: why this entry isn't public yet. */
  preview?: "draft" | "scheduled";
}
export interface PublicSection {
  key: string;
  type: string;
  title: string;
  subtitle: string;
  showInNav: boolean;
  audience: string;
  config: Record<string, unknown>;
  items: PublicItem[];
}

export type SiteMode = "public" | "beta" | "preview";

/** An entry is live when it's visible, published, and its publish time (if any) has passed. */
export function itemState(r: { visible: boolean; status: string; publishAt: number | null }, now = Date.now()): "live" | "draft" | "scheduled" | "hidden" {
  if (!r.visible) return "hidden";
  if (r.status === "draft") return "draft";
  if (r.publishAt && r.publishAt > now) return "scheduled";
  return "live";
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  await ensureSchema();
  const rows = await db.select().from(schema.settings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, safeParse<Record<string, unknown>>(r.value, {})]));
  const merged = {} as Record<string, unknown>;
  for (const [group, defaults] of Object.entries(DEFAULT_SETTINGS)) {
    merged[group] = { ...(defaults as object), ...(stored[group] ?? {}) };
  }
  return merged as SiteSettings;
});

export async function saveSettingsGroup(group: string, value: Record<string, unknown>) {
  await db
    .insert(schema.settings)
    .values({ key: group, value: JSON.stringify(value), updatedAt: Date.now() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: JSON.stringify(value), updatedAt: Date.now() } });
}

export const getAllSections = cache(async () => {
  await ensureSchema();
  const rows = await db.select().from(schema.sections).orderBy(asc(schema.sections.sortOrder));
  return rows.map((r) => ({
    ...r,
    config: { ...(getSectionType(r.type)?.defaultConfig ?? {}), ...safeParse<Record<string, unknown>>(r.config, {}) },
  }));
});

export async function getItems(sectionKey: string, opts: { onlyVisible?: boolean; mode?: SiteMode } = {}) {
  await ensureSchema();
  const rows = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.sectionKey, sectionKey))
    .orderBy(asc(schema.items.sortOrder), asc(schema.items.createdAt));
  const now = Date.now();
  return rows
    .filter((r) => {
      if (!opts.onlyVisible) return true;
      const st = itemState(r, now);
      return st === "live" || (opts.mode === "preview" && (st === "draft" || st === "scheduled"));
    })
    .map((r) => ({ ...r, data: safeParse<ItemData>(r.data, {}) }));
}

/** Settings safe to send to the browser (private groups such as notification addresses removed). */
export function publicSettings(s: SiteSettings): SiteSettings {
  return { ...s, notifications: { alertEmail: "", messageAlerts: false, includeMessage: false, feedbackAlerts: false } };
}

/**
 * Everything the home page needs, in one call. Disabled sections and non-live entries are excluded server-side.
 * mode: public (visitors) · beta (testers/admin: + beta-only sections) · preview (+ drafts & scheduled entries)
 */
export const getPublicSite = cache(async (mode: SiteMode = "public") => {
  const [rawSettings, allSections] = await Promise.all([getSettings(), getAllSections()]);
  const settings = publicSettings(rawSettings);
  const enabled = allSections.filter((s) => s.enabled && getSectionType(s.type) && (mode !== "public" || s.audience !== "beta"));
  const now = Date.now();
  const sections: PublicSection[] = await Promise.all(
    enabled.map(async (s) => {
      const def = getSectionType(s.type)!;
      const items = def.itemFields ? await getItems(s.key, { onlyVisible: true, mode }) : [];
      return {
        key: s.key,
        type: s.type,
        title: s.title,
        subtitle: s.subtitle,
        showInNav: s.showInNav,
        audience: s.audience,
        config: s.config,
        items: items.map((i) => {
          const st = itemState(i, now);
          return { id: i.id, featured: i.featured, data: i.data, ...(st === "draft" || st === "scheduled" ? { preview: st } : {}) };
        }),
      };
    }),
  );
  return { settings, sections };
});

export function projectSlug(data: ItemData): string {
  const s = typeof data.slug === "string" && data.slug ? data.slug : String(data.title ?? "");
  return slugify(s);
}

export async function getProjectBySlug(slug: string, mode: SiteMode = "public") {
  const all = await getAllSections();
  const projSections = all.filter((s) => s.type === "projects" && s.enabled && (mode !== "public" || s.audience !== "beta"));
  for (const s of projSections) {
    const items = await getItems(s.key, { onlyVisible: true, mode });
    const idx = items.findIndex((i) => projectSlug(i.data) === slug);
    if (idx >= 0) {
      const prev = items[idx - 1];
      const next = items[idx + 1];
      return {
        project: items[idx],
        section: s,
        prev: prev ? { title: String(prev.data.title ?? ""), slug: projectSlug(prev.data) } : null,
        next: next ? { title: String(next.data.title ?? ""), slug: projectSlug(next.data) } : null,
      };
    }
  }
  return null;
}
