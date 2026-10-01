import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LAYOUTS, resolveLayout, defaultLayout } from "@/lib/layouts";
import { SECTION_TYPES } from "@/lib/registry";
import { schemaFromFields } from "@/lib/validation";

describe("layout catalogue", () => {
  it("every section type offers at least 3 designs", () => {
    for (const type of Object.keys(SECTION_TYPES)) expect(LAYOUTS[type]?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("every layout has a component registered in SectionRenderer", () => {
    const src = fs.readFileSync(path.join(__dirname, "../src/components/site/SectionRenderer.tsx"), "utf8");
    for (const [type, list] of Object.entries(LAYOUTS)) {
      const line = src.split("\n").find((l) => l.trim().startsWith(`${type}: {`));
      expect(line, `VARIANTS entry for ${type}`).toBeTruthy();
      for (const l of list) expect(line!, `${type}:${l.value}`).toContain(`${l.value}:`);
    }
  });

  it("every layout has an admin thumbnail", () => {
    for (const [type, list] of Object.entries(LAYOUTS))
      for (const l of list) expect(fs.existsSync(path.join(__dirname, `../public/layouts/${type}-${l.value}.webp`)), `${type}-${l.value}.webp`).toBe(true);
  });

  it("falls back safely for unknown or malicious values", () => {
    expect(resolveLayout("projects", "rows")).toBe("rows");
    expect(resolveLayout("projects", "../../etc")).toBe(defaultLayout("projects"));
    expect(resolveLayout("projects", undefined)).toBe("classic");
    expect(resolveLayout("gallery", "nope")).toBe("ring");
  });

  it("server validation only accepts catalogue layouts", () => {
    const cfg = schemaFromFields(SECTION_TYPES.projects.configFields);
    expect(cfg.safeParse({ ...SECTION_TYPES.projects.defaultConfig, layout: "stack" }).success).toBe(true);
    expect(cfg.safeParse({ ...SECTION_TYPES.projects.defaultConfig, layout: "<script>" }).success).toBe(false);
  });
});
