/** Bulk import: candidate entries (from LinkedIn or the AI résumé reader) → a review list, and applying the chosen ones. */
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSectionType, type FieldDef } from "@/lib/registry";
import { schemaFromFields, slugify } from "@/lib/validation";
import { sameEntry, type Candidate } from "@/lib/import/linkedin";
import { newId } from "./ids";

/** Section types the importer can fill, in the order they're shown. */
export const IMPORT_TYPES = ["experience", "education", "projects", "skills", "certifications", "achievements"] as const;

/** Second field that must also match for two entries to count as the same (primary field alone otherwise). */
const DEDUPE_SECOND: Record<string, string> = { experience: "organization", education: "degree", certifications: "issuer" };

export interface ReviewEntry {
  id: string;
  type: string;
  typeLabel: string;
  sectionKey: string | null;
  sectionTitle: string;
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
  source: string;
  /** Title of the existing (or earlier imported) entry this looks like. */
  duplicate: string | null;
  problems: string[];
}

export function blankFor(fields: FieldDef[]): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const f of fields) d[f.name] = f.type === "tags" || f.type === "images" ? [] : f.type === "boolean" ? false : "";
  return d;
}

export function validateEntry(fields: FieldDef[], data: Record<string, unknown>) {
  const r = schemaFromFields(fields).safeParse({ ...blankFor(fields), ...data });
  if (r.success) return { ok: true as const, data: r.data as Record<string, unknown> };
  const labels = Object.fromEntries(fields.map((f) => [f.name, f.label]));
  const problems = r.error.issues.map((i) => {
    const k = String(i.path[0] ?? "");
    return `${labels[k] ?? k}: ${/required|Invalid option|expected one of/i.test(i.message) ? "missing — please fill in" : i.message}`;
  });
  return { ok: false as const, problems: [...new Set(problems)] };
}

/** Targets for the AI reader: the importable section types that exist on this site. */
export async function importTargets() {
  const sections = await db.select().from(schema.sections).orderBy(asc(schema.sections.sortOrder));
  const seen = new Set<string>();
  const out: { type: string; label: string; fields: FieldDef[] }[] = [];
  for (const s of sections) {
    const def = getSectionType(s.type);
    if (!def?.itemFields || !(IMPORT_TYPES as readonly string[]).includes(s.type) || seen.has(s.type)) continue;
    seen.add(s.type);
    out.push({ type: s.type, label: def.label, fields: def.itemFields });
  }
  return out;
}

/** Matches each candidate to the first section of its type, flags duplicates and missing required fields. */
export async function buildReview(candidates: Candidate[]): Promise<ReviewEntry[]> {
  const sections = await db.select().from(schema.sections).orderBy(asc(schema.sections.sortOrder));
  const items = await db.select().from(schema.items);
  const out: ReviewEntry[] = [];
  candidates.slice(0, 300).forEach((c, idx) => {
    const def = getSectionType(c.type);
    if (!def?.itemFields) return;
    const fields = def.itemFields;
    const primary = (fields.find((f) => f.primary) ?? fields[0]).name;
    const secondary = fields.find((f) => f.secondary)?.name;
    const idField = DEDUPE_SECOND[c.type]; // e.g. same role at a different company is a different entry
    const section = sections.find((s) => s.type === c.type) ?? null;
    let duplicate: string | null = null;
    if (section) {
      const hit = items.filter((i) => i.sectionKey === section.key).map((i) => JSON.parse(i.data) as Record<string, unknown>).find((d) => sameEntry(d, c.data, primary, idField));
      if (hit) duplicate = `Already on your site: “${String(hit[primary])}”`;
    }
    if (!duplicate) {
      const earlier = out.find((e) => e.type === c.type && sameEntry(e.data, c.data, primary, idField));
      if (earlier) duplicate = `Listed twice in this import (“${earlier.title}”)`;
    }
    const v = validateEntry(fields, c.data);
    out.push({
      id: `e${idx}`,
      type: c.type,
      typeLabel: def.label,
      sectionKey: section?.key ?? null,
      sectionTitle: section?.title ?? def.label,
      title: String(c.data[primary] ?? "") || "(untitled)",
      subtitle: secondary ? String(c.data[secondary] ?? "") : "",
      data: { ...blankFor(fields), ...c.data },
      source: c.source,
      duplicate,
      problems: section ? (v.ok ? [] : v.problems) : [`Your site has no “${def.label}” section yet — add one in Sections & content first.`],
    });
  });
  return out;
}

/** Inserts the chosen entries (all-or-nothing). Returns per-entry field problems instead of inserting if any are invalid. */
export async function applyEntries(entries: { id: string; sectionKey: string; data: Record<string, unknown> }[], status: "draft" | "published") {
  const sections = await db.select().from(schema.sections);
  const prepared: { sectionKey: string; type: string; data: Record<string, unknown> }[] = [];
  const errors: Record<string, string[]> = {};
  for (const e of entries) {
    const s = sections.find((x) => x.key === e.sectionKey);
    const def = s && getSectionType(s.type);
    if (!s || !def?.itemFields) {
      errors[e.id] = ["That section no longer exists."];
      continue;
    }
    const v = validateEntry(def.itemFields, e.data);
    if (!v.ok) errors[e.id] = v.problems;
    else prepared.push({ sectionKey: s.key, type: s.type, data: v.data });
  }
  if (Object.keys(errors).length) return { ok: false as const, errors };

  const all = await db.select().from(schema.items);
  const slugs = new Set(all.map((i) => String((JSON.parse(i.data) as Record<string, unknown>).slug ?? "")).filter(Boolean));
  const nextOrder: Record<string, number> = {};
  for (const i of all) nextOrder[i.sectionKey] = Math.max(nextOrder[i.sectionKey] ?? 0, i.sortOrder + 1);
  const t = Date.now();
  const counts: Record<string, number> = {};
  await db.transaction(async (tx) => {
    let n = 0;
    for (const p of prepared) {
      if (p.type === "projects") {
        const base = slugify(String(p.data.slug || p.data.title || "")) || newId().slice(0, 8);
        let slug = base;
        for (let k = 2; slugs.has(slug); k++) slug = `${base}-${k}`;
        slugs.add(slug);
        p.data.slug = slug;
      }
      const order = nextOrder[p.sectionKey] ?? 0;
      nextOrder[p.sectionKey] = order + 1;
      await tx.insert(schema.items).values({ id: newId(), sectionKey: p.sectionKey, data: JSON.stringify(p.data), visible: true, featured: false, status, publishAt: null, sortOrder: order, createdAt: t + n, updatedAt: t + n });
      counts[p.sectionKey] = (counts[p.sectionKey] ?? 0) + 1;
      n++;
    }
  });
  return { ok: true as const, added: prepared.length, counts };
}

