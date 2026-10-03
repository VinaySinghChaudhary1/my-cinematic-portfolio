/** Turns registry field definitions into a JSON Schema for the AI, and validates what comes back. */
import type { FieldDef } from "@/lib/registry";
import { schemaFromFields } from "@/lib/validation";

/** Fields the AI never fills: media (handled by the image generator) and design choices. */
export const AI_SKIP_TYPES = new Set(["image", "images", "file", "layout", "color"]);

export function aiFields(fields: FieldDef[]): FieldDef[] {
  return fields.filter((f) => !AI_SKIP_TYPES.has(f.type));
}

function describe(f: FieldDef): string {
  const bits = [f.label];
  if (f.help) bits.push(f.help);
  if (f.type === "date") bits.push('Format "YYYY-MM" (or "YYYY-MM-DD"); "" if unknown');
  if (f.type === "url") bits.push('Full https:// URL taken from the input, or "" — never guess links');
  if (f.type === "email") bits.push('Email address or ""');
  if (f.type === "markdown") bits.push("Markdown allowed: ## headings, - bullet lists, **bold**");
  if (f.type === "tags") bits.push("Short items, max 12");
  if (f.maxLength) bits.push(`Max ${f.maxLength} characters`);
  if (f.min !== undefined || f.max !== undefined) bits.push(`Range ${f.min ?? "-∞"}…${f.max ?? "∞"}`);
  return bits.join(". ");
}

export function jsonSchemaFor(fields: FieldDef[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const f of aiFields(fields)) {
    const description = describe(f);
    switch (f.type) {
      case "number":
        properties[f.name] = { type: ["number", "null"], description: `${description}. null if unknown` };
        break;
      case "boolean":
        properties[f.name] = { type: "boolean", description };
        break;
      case "tags":
        properties[f.name] = { type: "array", items: { type: "string" }, description };
        break;
      case "select":
        properties[f.name] = { type: "string", enum: [...(f.options ?? []).map((o) => o.value), ""], description: `${description}. One of: ${(f.options ?? []).map((o) => `${o.value} (${o.label})`).join(", ")}` };
        break;
      default:
        properties[f.name] = { type: "string", description };
    }
  }
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}

/**
 * Keeps only values that pass the same validation as manual input. Empty answers are dropped (so they never
 * overwrite something you typed); invalid ones are reported back.
 */
export function cleanAiValues(fields: FieldDef[], raw: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  const rejected: { field: string; reason: string }[] = [];
  for (const f of aiFields(fields)) {
    let v = raw[f.name];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    if (f.type === "tags" && Array.isArray(v)) v = v.map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
    if (f.type === "number" && typeof v === "string") v = Number(v);
    if (typeof v === "string") v = v.trim();
    if (typeof v === "string" && f.maxLength && v.length > f.maxLength) v = v.slice(0, f.maxLength);
    const r = schemaFromFields([{ ...f, required: false }]).safeParse({ [f.name]: v });
    if (r.success) values[f.name] = (r.data as Record<string, unknown>)[f.name];
    else rejected.push({ field: f.label, reason: r.error.issues[0]?.message ?? "invalid" });
  }
  return { values, rejected };
}
