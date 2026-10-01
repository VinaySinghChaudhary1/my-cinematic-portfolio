import { describe, it, expect } from "vitest";
import { detectType, resolveLocal } from "@/lib/server/storage";
import { signSession, verifySession } from "@/lib/server/session";

describe("upload type detection (magic bytes)", () => {
  it("detects real images and PDFs", () => {
    expect(detectType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detectType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))?.mime).toBe("image/png");
    expect(detectType(new TextEncoder().encode("%PDF-1.7"))?.mime).toBe("application/pdf");
  });
  it("rejects SVG/HTML/scripts disguised as images", () => {
    expect(detectType(new TextEncoder().encode("<svg><script>alert(1)</script></svg>"))).toBeNull();
    expect(detectType(new TextEncoder().encode("<html>"))).toBeNull();
    expect(detectType(new TextEncoder().encode("MZ\x90\x00"))).toBeNull();
  });
});

describe("local file path safety", () => {
  it("only resolves well-formed upload keys", () => {
    expect(resolveLocal("images/0f8f0e6e-1111-2222-3333-444455556666.webp")).toBeTruthy();
    expect(resolveLocal("../.env.local")).toBeNull();
    expect(resolveLocal("images/../../secret.txt")).toBeNull();
    expect(resolveLocal("images/notauuid.png")).toBeNull();
  });
});

describe("session tokens", () => {
  it("round-trips a valid session", async () => {
    const t = await signSession({ sub: "u1", sv: 3, email: "a@b.co" });
    expect(await verifySession(t)).toMatchObject({ sub: "u1", sv: 3 });
  });
  it("rejects tampered or garbage tokens", async () => {
    const t = await signSession({ sub: "u1", sv: 1, email: "a@b.co" });
    const [h, p, s] = t.split(".");
    const forged = JSON.parse(Buffer.from(p, "base64url").toString());
    forged.sub = "attacker";
    const bad = `${h}.${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${s}`;
    expect(await verifySession(bad)).toBeNull();
    expect(await verifySession("not-a-token")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});
