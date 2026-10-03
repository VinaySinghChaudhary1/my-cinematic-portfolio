import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseContent } from "@/lib/content-import";

const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/vinay.json"), "utf8"));

describe("content import", () => {
  it("accepts the bundled personal content file", () => {
    const r = parseContent(file);
    if (!r.ok) throw new Error(r.errors.join("\n"));
    expect(r.content.sections.length).toBeGreaterThan(5);
    expect(r.content.sections.find((s) => s.key === "projects")!.items.some((i) => i.featured)).toBe(true);
  });

  it("every referenced local file exists in public/", () => {
    const r = parseContent(file);
    if (!r.ok) throw new Error("invalid");
    const missing = r.content.assets.filter((a) => !fs.existsSync(path.join(process.cwd(), "public", a)));
    expect(missing).toEqual([]);
  });

  it("reports unknown types, bad layouts and unsafe links", () => {
    const r = parseContent({
      sections: [
        { key: "x", type: "nope" },
        { key: "p", type: "projects", config: { layout: "does-not-exist" }, items: [{ title: "A", summary: "B", status: "completed", repoUrl: "javascript:alert(1)" }] },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join("\n")).toMatch(/unknown section type/);
    expect(r.errors.join("\n")).toMatch(/layout/);
    expect(r.errors.join("\n")).toMatch(/repoUrl/);
  });

  it("rejects duplicate keys and unknown settings groups", () => {
    const r = parseContent({ settings: { nope: {} }, sections: [{ key: "a", type: "contact" }, { key: "a", type: "contact" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/duplicate key[\s\S]*|unknown settings group/);
  });
});
