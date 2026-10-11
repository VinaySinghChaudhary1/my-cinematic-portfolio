import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { normalizeSiteUrl, pickSiteUrl } from "@/lib/site-url";
import { checkDomain, guessProvider, normalizeHost, type DomainDeps } from "@/lib/move/domain";
import { envTemplate, targets } from "@/lib/move/targets";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pf-move-test-"));
process.env.DATA_DIR = TMP;
process.env.DATABASE_URL = `file:${path.join(TMP, "move.db")}`;
process.env.STORAGE_DRIVER = "local";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";

afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe("website address", () => {
  it("keeps only https origins (http only for localhost)", () => {
    expect(normalizeSiteUrl("https://yourname.com/some/path?x=1")).toBe("https://yourname.com");
    expect(normalizeSiteUrl("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(normalizeSiteUrl("http://yourname.com")).toBeNull();
    expect(normalizeSiteUrl("/admin")).toBeNull();
    expect(normalizeSiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSiteUrl("")).toBeNull();
  });
  it("admin setting beats SITE_URL, which beats the default", () => {
    expect(pickSiteUrl("https://new.example", "https://old.example")).toBe("https://new.example");
    expect(pickSiteUrl("", "https://old.example/")).toBe("https://old.example");
    expect(pickSiteUrl("not a url", undefined)).toBe("http://localhost:3000");
  });
});

describe("domain checker rules", () => {
  it("normalises what people type", () => {
    expect(normalizeHost("https://WWW.YourName.com/path")).toBe("www.yourname.com");
    expect(normalizeHost("yourname.me")).toBe("yourname.me");
    expect(normalizeHost("not a domain")).toBeNull();
    expect(normalizeHost("localhost")).toBeNull();
  });
  it("recognises hosts from DNS values", () => {
    expect(guessProvider(["76.76.21.21"], [])).toBe("Vercel");
    expect(guessProvider([], ["x.netlify.app."])).toBe("Netlify");
    expect(guessProvider(["185.199.108.153"], [])).toBe("GitHub Pages");
    expect(guessProvider(["1.2.3.4"], [])).toBeNull();
  });

  const records: Record<string, string[]> = {
    "A yourname.com": ["76.76.21.21"],
    "CNAME www.yourname.com": ["yourname.com"],
    "TXT resend._domainkey.yourname.com": ["p=MIGfMA0"],
    "CNAME send.yourname.com": ["send.forge.rmta.net"],
    "TXT _dmarc.yourname.com": ["v=DMARC1; p=none;"],
  };
  const deps = (over: Partial<DomainDeps> = {}): DomainDeps => ({
    resolve: async (t, n) => records[`${t} ${n}`] ?? [],
    probe: async () => ({ ok: true, status: 200, site: "me123" }),
    me: { fingerprint: "me123", siteUrl: "https://yourname.com", email: true, google: true, emailFrom: "Me <noreply@yourname.com>" },
    ...over,
  });
  const byId = (r: Awaited<ReturnType<typeof checkDomain>>) => Object.fromEntries(r.checks.map((c) => [c.id, c]));

  it("all good when the domain opens this site and email records exist", async () => {
    const c = byId(await checkDomain("www.yourname.com", deps()));
    expect(c.dns.status).toBe("ok");
    expect(c.dns.detail).toContain("Vercel");
    expect(c.www.status).toBe("ok");
    expect(c.https.status).toBe("ok");
    expect(c.address.status).toBe("ok");
    expect([c.dkim.status, c.spf.status, c.dmarc.status]).toEqual(["ok", "ok", "ok"]);
    expect(c.google.detail).toContain("https://yourname.com/api/auth/google/callback");
  });
  it("warns when the domain still opens the old copy", async () => {
    const c = byId(await checkDomain("yourname.com", deps({ probe: async () => ({ ok: true, status: 200, site: "old999" }) })));
    expect(c.https.status).toBe("warn");
    expect(c.https.detail).toMatch(/another copy/);
  });
  it("fails clearly for a brand-new domain with no records", async () => {
    const c = byId(await checkDomain("brandnew.dev", deps({ resolve: async () => [], probe: async () => ({ ok: false, status: 0, error: "domain not found in DNS" }) })));
    expect(c.dns.status).toBe("fail");
    expect(c.https.status).toBe("fail");
    expect(c.address.status).toBe("warn");
    expect(c.dkim.status).toBe("fail");
  });
  it("never reports missing records when DNS itself can't be reached", async () => {
    const c = byId(await checkDomain("yourname.com", deps({ resolve: async () => Promise.reject(new Error("DNS lookup unavailable")) })));
    expect(c.dns.status).toBe("info");
    expect(c.www).toBeUndefined();
    expect(c.dkim).toBeUndefined();
    expect(c.email.status).toBe("info");
    expect(c.https.status).toBe("ok");
  });
});

describe("hosting plans", () => {
  it("every host lists the essentials and templates never contain secret values", () => {
    for (const t of targets("https://yourname.com")) {
      const names = t.env.map((v) => v.name);
      expect(names).toEqual(expect.arrayContaining(["SITE_URL", "AUTH_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"]));
      expect(t.steps.length).toBeGreaterThan(2);
      const tpl = envTemplate(t);
      expect(tpl).toContain("SITE_URL=https://yourname.com");
      for (const v of t.env.filter((x) => x.secret)) expect(tpl).toMatch(new RegExp(`^${v.name}=$`, "m"));
    }
    const vercel = targets("https://yourname.com").find((t) => t.id === "vercel")!;
    expect(vercel.env.map((v) => v.name)).toEqual(expect.arrayContaining(["DATABASE_URL", "DATABASE_AUTH_TOKEN", "BLOB_READ_WRITE_TOKEN"]));
    expect(targets("https://x.dev").find((t) => t.id === "netlify")!.env.map((v) => v.name)).toContain("S3_BUCKET");
  });
});

describe("transfer codes", () => {
  beforeAll(async () => {
    const { bootstrap } = await import("@/lib/server/bootstrap");
    await bootstrap();
  });

  it("are 120-bit, readable, and forgiving about case and dashes", async () => {
    const { newTransferCode, normalizeCode, codeHash, looksLikeCode } = await import("@/lib/server/move");
    const c = newTransferCode();
    expect(c).toMatch(/^([A-HJ-NP-Z2-9]{4}-){5}[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeCode(c.toLowerCase().replace(/-/g, " "))).toBe(c.replace(/-/g, ""));
    expect(codeHash(c)).toBe(codeHash(c.toLowerCase()));
    expect(looksLikeCode("abc")).toBe(false);
  });

  it("seal a full backup that only the code opens; cancelling revokes it", async () => {
    const { createTransfer, openTransfer, cancelTransfers, activeTransfer, normalizeCode } = await import("@/lib/server/move");
    const { decryptWithPassword } = await import("@/lib/server/backup/crypto");
    const { readArchive } = await import("@/lib/server/backup/archive");
    const t = await createTransfer({ includeMessages: false });
    expect(t.code).toHaveLength(29);
    expect(await activeTransfer()).not.toBeNull();

    const opened = await openTransfer(t.code.toLowerCase());
    expect(opened?.parts).toBe(t.parts);
    const plain = await decryptWithPassword(opened!.bytes, normalizeCode(t.code));
    const archive = readArchive(plain);
    expect(archive.content?.sections?.length).toBeGreaterThan(0);
    await expect(decryptWithPassword(opened!.bytes, "WRONGWRONGWRONGWRONGWRON")).rejects.toThrow();

    expect(await openTransfer("AAAA-BBBB-CCCC-DDDD-EEEE-FFFF")).toBeNull();
    // a new code replaces the old one
    const t2 = await createTransfer({ includeMessages: false });
    expect(await openTransfer(t.code)).toBeNull();
    expect(await openTransfer(t2.code)).not.toBeNull();
    expect(await cancelTransfers()).toBe(1);
    expect(await openTransfer(t2.code)).toBeNull();
    expect(await activeTransfer()).toBeNull();
  }, 60_000);

  it("gives every database its own fingerprint", async () => {
    const { siteFingerprint } = await import("@/lib/server/instance");
    const a = await siteFingerprint();
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await siteFingerprint()).toBe(a);
  });
});
