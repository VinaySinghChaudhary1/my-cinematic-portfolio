import { describe, it, expect } from "vitest";
import { parseAdminTheme, DEFAULT_ADMIN_THEME } from "@/lib/admin-theme";

describe("admin theme cookie", () => {
  it("accepts light, dark and system", () => {
    expect(parseAdminTheme("light")).toBe("light");
    expect(parseAdminTheme("dark")).toBe("dark");
    expect(parseAdminTheme("system")).toBe("system");
  });
  it("falls back to dark for anything else", () => {
    expect(DEFAULT_ADMIN_THEME).toBe("dark");
    for (const v of [undefined, null, "", "LIGHT", "<script>", "blue"]) expect(parseAdminTheme(v)).toBe("dark");
  });
});
