import { describe, it, expect } from "vitest";
import { formatMonth, formatRange, youtubeEmbed, arr, num } from "@/lib/utils";

describe("formatting helpers", () => {
  it("formats months and ranges", () => {
    expect(formatMonth("2025-03")).toBe("Mar 2025");
    expect(formatMonth("2025-03-14")).toBe("Mar 2025");
    expect(formatRange("2024-01", "")).toBe("Jan 2024 — Present");
    expect(formatRange("2024-01", "2024-06")).toBe("Jan 2024 — Jun 2024");
    expect(formatRange("", "")).toBe("");
  });
  it("only embeds valid YouTube ids via the privacy-friendly domain", () => {
    expect(youtubeEmbed("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toContain("dQw4w9WgXcQ");
    expect(youtubeEmbed("https://evil.com/<script>")).toBeNull();
  });
  it("coerces unknown JSON safely", () => {
    expect(arr(["a", 1, null, "b"])).toEqual(["a", "b"]);
    expect(num("12")).toBe(12);
    expect(num("x", 5)).toBe(5);
  });
});
