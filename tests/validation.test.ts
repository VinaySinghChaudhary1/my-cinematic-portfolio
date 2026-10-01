import { describe, it, expect } from "vitest";
import { isSafeUrl, isSafeMediaUrl, safeAdminReturnPath, slugify, schemaFromFields, passwordSchema, contactSchema } from "@/lib/validation";
import { SECTION_TYPES } from "@/lib/registry";

describe("URL safety", () => {
  it("allows https, http, site paths, anchors and mailto", () => {
    for (const u of ["https://github.com/x", "http://example.com", "/projects/a", "#projects", "mailto:a@b.co", ""]) expect(isSafeUrl(u)).toBe(true);
  });
  it("blocks script and protocol-relative URLs", () => {
    for (const u of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>", "//evil.com", "/\\evil.com", "vbscript:x", "#<img>"]) expect(isSafeUrl(u)).toBe(false);
  });
  it("media refs only allow uploads, demo assets or https", () => {
    expect(isSafeMediaUrl("/media/images/0f8f0e6e-1111-2222-3333-444455556666.webp")).toBe(true);
    expect(isSafeMediaUrl("/demo/project-1.webp")).toBe(true);
    expect(isSafeMediaUrl("https://abc.public.blob.vercel-storage.com/x.png")).toBe(true);
    expect(isSafeMediaUrl("http://insecure.com/x.png")).toBe(false);
    expect(isSafeMediaUrl("/media/../../.env")).toBe(false);
    expect(isSafeMediaUrl("/etc/passwd")).toBe(false);
  });
});

describe("open-redirect protection", () => {
  it("keeps internal admin paths", () => {
    expect(safeAdminReturnPath("/admin/sections")).toBe("/admin/sections");
    expect(safeAdminReturnPath("/admin/sections/projects?x=1")).toBe("/admin/sections/projects?x=1");
  });
  it("rejects external / tricky targets", () => {
    for (const n of ["https://evil.com", "//evil.com", "/\\evil.com", "/admin\\@evil.com", "/", "/admin/login", null, undefined, "javascript:alert(1)"]) {
      expect(safeAdminReturnPath(n)).toBe("/admin");
    }
  });
});

describe("slugify", () => {
  it("creates url-safe slugs", () => {
    expect(slugify("Neural Notes!")).toBe("neural-notes");
    expect(slugify("  Café & Ünicode  ")).toBe("cafe-unicode");
  });
});

describe("registry-driven validation", () => {
  const project = schemaFromFields(SECTION_TYPES.projects.itemFields!);
  it("accepts a valid project and strips unknown keys", () => {
    const r = project.parse({ title: "X", summary: "Y", status: "completed", tech: ["React"], evil: "<script>" });
    expect(r).not.toHaveProperty("evil");
  });
  it("rejects missing required fields, bad enums and unsafe links", () => {
    const r = project.safeParse({ title: "", summary: "s", status: "nope", liveUrl: "javascript:alert(1)" });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["title", "status", "liveUrl"]));
  });
  it("validates numbers within range", () => {
    const skills = schemaFromFields(SECTION_TYPES.skills.itemFields!);
    expect(skills.safeParse({ name: "Py", category: "P", level: 150 }).success).toBe(false);
    expect(skills.safeParse({ name: "Py", category: "P", level: 80 }).success).toBe(true);
  });
  it("every section type has a valid definition", () => {
    for (const def of Object.values(SECTION_TYPES)) {
      expect(() => schemaFromFields(def.configFields)).not.toThrow();
      if (def.itemFields) expect(def.itemFields.some((f) => f.primary) || def.type === "gallery").toBe(true);
    }
  });
});

describe("password & contact rules", () => {
  it("requires strong passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123").success).toBe(false);
    expect(passwordSchema.safeParse("Strong-Pass-2026").success).toBe(true);
  });
  it("validates contact form and honeypot", () => {
    expect(contactSchema.safeParse({ name: "A", email: "bad", message: "hi" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ann", email: "a@b.co", message: "Hello there friend" }).success).toBe(true);
    expect(contactSchema.safeParse({ name: "Ann", email: "a@b.co", message: "Hello there friend", website: "spam" }).success).toBe(false);
  });
});
