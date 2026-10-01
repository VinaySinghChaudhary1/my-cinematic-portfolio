import { z } from "zod";
import type { FieldDef } from "./registry";

/** Accept only http(s) URLs or site-relative paths. Blocks javascript:, data:, protocol-relative (//evil) etc. */
export function isSafeUrl(value: string): boolean {
  if (value === "") return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return true;
  if (value.startsWith("#")) return /^#[A-Za-z0-9_-]*$/.test(value);
  if (value.startsWith("mailto:")) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Media references: uploaded files (/media/…), bundled demo assets (/demo/…) or https URLs. */
export function isSafeMediaUrl(value: string): boolean {
  if (value === "") return true;
  if (/^\/(media|demo)\/[A-Za-z0-9/_.\-]+$/.test(value) && !value.includes("..")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const safeUrl = z.string().trim().max(2048).refine(isSafeUrl, "Must be a valid https:// URL or a /path");
const mediaUrl = z.string().trim().max(2048).refine(isSafeMediaUrl, "Invalid media reference");
const dateStr = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}(-\d{2})?$/.test(v), "Use YYYY-MM or YYYY-MM-DD");

function fieldSchema(f: FieldDef): z.ZodTypeAny {
  let s: z.ZodTypeAny;
  switch (f.type) {
    case "text":
    case "textarea":
    case "markdown": {
      let str = z.string().trim().max(f.maxLength ?? 5000);
      if (f.required) str = str.min(1, `${f.label} is required`);
      s = str;
      break;
    }
    case "email":
      s = f.required ? z.email() : z.union([z.literal(""), z.email()]);
      break;
    case "url":
      s = f.required ? safeUrl.refine((v) => v.length > 0, `${f.label} is required`) : safeUrl;
      break;
    case "date":
      s = dateStr;
      break;
    case "number": {
      let n = z.coerce.number();
      if (f.min !== undefined) n = n.min(f.min);
      if (f.max !== undefined) n = n.max(f.max);
      s = f.required ? n : z.union([z.literal(""), n]).transform((v) => (v === "" ? null : v)).nullable();
      break;
    }
    case "select": {
      const values = (f.options ?? []).map((o) => o.value) as [string, ...string[]];
      s = f.required ? z.enum(values) : z.union([z.literal(""), z.enum(values)]);
      break;
    }
    case "tags":
      s = z.array(z.string().trim().min(1).max(80)).max(60);
      break;
    case "boolean":
      s = z.boolean();
      break;
    case "image":
    case "file":
      s = f.required ? mediaUrl.refine((v) => v.length > 0, `${f.label} is required`) : mediaUrl;
      break;
    case "images":
      s = z.array(mediaUrl).max(40);
      break;
    case "color":
      s = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #8b5cf6");
      break;
    default:
      s = z.unknown();
  }
  return f.required ? s : s.optional();
}

/** Builds a strict object schema; unknown keys are dropped. */
export function schemaFromFields(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) shape[f.name] = fieldSchema(f);
  return z.object(shape).strip();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Only allow redirects to internal admin paths — prevents open-redirects after login. */
export function safeAdminReturnPath(next: string | null | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/admin") || next.startsWith("//") || next.includes("\\") || next.startsWith("/admin/login")) {
    return "/admin";
  }
  try {
    const u = new URL(next, "http://x");
    if (u.origin !== "http://x") return "/admin";
    return u.pathname + u.search;
  } catch {
    return "/admin";
  }
}

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200)
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), "Mix upper-case, lower-case letters and numbers");

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.email("Please enter a valid email").max(200),
  subject: z.string().trim().max(150).optional().default(""),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(5000),
  website: z.string().max(0).optional().default(""), // honeypot – must stay empty
  startedAt: z.number().optional(),
});
