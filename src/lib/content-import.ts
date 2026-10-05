/**
 * Content file → validated content bundle.
 * Used by `npm run content:apply` (scripts/apply-content.ts) and the unit tests.
 *
 * The content file is plain JSON (see content/README.md):
 *   { settings: { profile: {...}, socials: {...}, ... },
 *     sections: [ { key, type, title, subtitle, enabled, showInNav?, config: {...}, items: [ {...}, ... ] } ] }
 * Each item may carry `"featured": true`, `"visible": false`, `"draft": true` and `"publishAt": <ms or ISO date>`
 * (scheduled); a section may carry `"audience": "beta"` (testers only). Everything else is validated against
 * the section's field definitions in the registry (unknown keys are dropped, bad values are reported).
 */
import { getSectionType } from "./registry";
import { SETTINGS_GROUPS } from "./settings-def";
import { schemaFromFields } from "./validation";

export interface ImportedItem {
  data: Record<string, unknown>;
  featured: boolean;
  visible: boolean;
  status: "published" | "draft";
  publishAt: number | null;
}
export interface ImportedSection {
  key: string;
  type: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  showInNav: boolean;
  audience: "public" | "beta";
  config: Record<string, unknown>;
  items: ImportedItem[];
}
export interface ImportedContent {
  settings: Record<string, Record<string, unknown>>;
  sections: ImportedSection[];
  /** Local asset paths (/me/…, /demo/…) referenced anywhere — checked against public/ by the script. */
  assets: string[];
}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);

export function collectAssets(v: unknown, out: Set<string>) {
  if (typeof v === "string") {
    if (/^\/(me|demo)\//.test(v)) out.add(v);
  } else if (Array.isArray(v)) v.forEach((x) => collectAssets(x, out));
  else if (isObj(v)) Object.values(v).forEach((x) => collectAssets(x, out));
}

/** publishAt in a content file: null/absent → null, number (ms) or ISO string → ms, anything else → undefined (error). */
export function parseWhen(v: unknown): number | null | undefined {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return undefined;
}

/** Item meta keys written next to the fields when exporting (inverse of parseContent). */
export function itemMeta(i: { featured: boolean; visible: boolean; status: string; publishAt: number | null }) {
  return {
    ...(i.featured ? { featured: true } : {}),
    ...(i.visible ? {} : { visible: false }),
    ...(i.status === "draft" ? { draft: true } : {}),
    ...(i.publishAt ? { publishAt: new Date(i.publishAt).toISOString() } : {}),
  };
}

export function parseContent(input: unknown): { ok: true; content: ImportedContent } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["Content file must be a JSON object."] };

  // ── settings ──
  const settings: ImportedContent["settings"] = {};
  if (input.settings !== undefined) {
    if (!isObj(input.settings)) errors.push("settings must be an object");
    else
      for (const [group, value] of Object.entries(input.settings)) {
        const def = SETTINGS_GROUPS.find((g) => g.key === group);
        if (!def) {
          errors.push(`settings.${group}: unknown settings group (allowed: ${SETTINGS_GROUPS.map((g) => g.key).join(", ")})`);
          continue;
        }
        const r = schemaFromFields(def.fields.map((f) => ({ ...f, required: false }))).safeParse(value);
        if (!r.success) r.error.issues.forEach((i) => errors.push(`settings.${group}.${i.path.join(".")}: ${i.message}`));
        else settings[group] = r.data as Record<string, unknown>;
      }
  }

  // ── sections ──
  const sections: ImportedSection[] = [];
  if (!Array.isArray(input.sections)) errors.push("sections must be an array");
  else {
    const seen = new Set<string>();
    input.sections.forEach((s, si) => {
      const where = `sections[${si}]`;
      if (!isObj(s)) return void errors.push(`${where}: must be an object`);
      const key = String(s.key ?? "").trim();
      const type = String(s.type ?? "").trim();
      const def = getSectionType(type);
      if (!/^[a-z0-9-]{1,40}$/.test(key)) errors.push(`${where}.key: use lowercase letters, numbers and dashes`);
      if (seen.has(key)) errors.push(`${where}.key: duplicate key "${key}"`);
      seen.add(key);
      if (!def) return void errors.push(`${where}.type: unknown section type "${type}"`);
      const label = `${where} (${key})`;

      const cfg = schemaFromFields(def.configFields).safeParse({ ...def.defaultConfig, ...(isObj(s.config) ? s.config : {}) });
      if (!cfg.success) cfg.error.issues.forEach((i) => errors.push(`${label}.config.${i.path.join(".")}: ${i.message}`));

      const items: ImportedItem[] = [];
      const rawItems = s.items ?? [];
      if (!Array.isArray(rawItems)) errors.push(`${label}.items: must be an array`);
      else if (rawItems.length && !def.itemFields) errors.push(`${label}.items: section type "${type}" has no items`);
      else if (def.itemFields) {
        const schema = schemaFromFields(def.itemFields);
        rawItems.forEach((it, ii) => {
          if (!isObj(it)) return void errors.push(`${label}.items[${ii}]: must be an object`);
          const { featured, visible, draft, publishAt, ...rest } = it;
          const when = parseWhen(publishAt);
          if (when === undefined) errors.push(`${label}.items[${ii}].publishAt: use a date like "2026-11-01T09:00" or a timestamp`);
          const r = schema.safeParse(rest);
          if (!r.success) r.error.issues.forEach((i) => errors.push(`${label}.items[${ii}].${i.path.join(".")}: ${i.message}`));
          else items.push({ data: r.data as Record<string, unknown>, featured: featured === true, visible: visible !== false, status: draft === true ? "draft" : "published", publishAt: when ?? null });
        });
      }

      if (cfg.success)
        sections.push({
          key,
          type,
          title: String(s.title ?? def.label).slice(0, 80),
          subtitle: String(s.subtitle ?? "").slice(0, 200),
          enabled: s.enabled !== false,
          showInNav: typeof s.showInNav === "boolean" ? s.showInNav : type !== "hero",
          audience: s.audience === "beta" ? "beta" : "public",
          config: cfg.data as Record<string, unknown>,
          items,
        });
    });
  }

  if (errors.length) return { ok: false, errors };
  const assets = new Set<string>();
  collectAssets(settings, assets);
  collectAssets(sections, assets);
  return { ok: true, content: { settings, sections, assets: [...assets].sort() } };
}
