import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { zipSync, strToU8 } from "fflate";

// Isolated database + storage for these tests (set BEFORE the app modules load).
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pf-backup-test-"));
process.env.DATA_DIR = TMP;
process.env.DATABASE_URL = `file:${path.join(TMP, "test.db")}`;
process.env.STORAGE_DRIVER = "local";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";

type Engine = typeof import("@/lib/server/backup/engine");
type Archive = typeof import("@/lib/server/backup/archive");
type Crypto = typeof import("@/lib/server/backup/crypto");
let engine: Engine, archive: Archive, crypto: Crypto;
let dbm: typeof import("@/db");

beforeAll(async () => {
  dbm = await import("@/db");
  engine = await import("@/lib/server/backup/engine");
  archive = await import("@/lib/server/backup/archive");
  crypto = await import("@/lib/server/backup/crypto");
  const { bootstrap } = await import("@/lib/server/bootstrap");
  await bootstrap(); // demo content into the empty test DB
});
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe("backup encryption", () => {
  it("round-trips with the right password and refuses a wrong one", async () => {
    const data = strToU8("hello portfolio");
    const enc = await crypto.encryptWithPassword(data, "a long enough password");
    expect(crypto.encryptionKind(enc)).toBe("password");
    expect(Buffer.from(await crypto.decryptWithPassword(enc, "a long enough password")).toString()).toBe("hello portfolio");
    await expect(crypto.decryptWithPassword(enc, "the wrong password!")).rejects.toThrow(/Wrong password/);
  });
  it("detects tampering", async () => {
    const enc = await crypto.encryptAtRest(strToU8("secret content"));
    enc[enc.length - 20] ^= 0xff;
    await expect(crypto.decryptAtRest(enc)).rejects.toThrow();
  });
  it("rejects short passwords", async () => {
    await expect(crypto.encryptWithPassword(strToU8("x"), "short")).rejects.toThrow(/at least/);
  });
});

describe("archive safety", () => {
  const meta = { appVersion: "test", createdAt: new Date().toISOString(), siteUrl: "", kind: "manual", label: "", options: { sections: "all" as const, settings: true, media: true, bundled: true, messages: false, audit: false }, counts: { sections: 0, items: 0, settings: 0, media: 0, bundled: 0, messages: 0, audit: 0 }, warnings: [] };

  it("verifies checksums", () => {
    const zip = archive.buildArchive(meta, { content: { sections: [] }, files: { "media/a.webp": new Uint8Array([1, 2, 3]) } });
    expect(archive.readArchive(zip).files["media/a.webp"]).toHaveLength(3);
    // rebuild the zip with a modified file but the original manifest → must be rejected
    const read = archive.readArchive(zip);
    const forged = zipSync({ "manifest.json": strToU8(JSON.stringify(read.manifest)), "content.json": strToU8(JSON.stringify({ sections: [] }, null, 2)), "media/a.webp": new Uint8Array([9, 9, 9]) });
    expect(() => archive.readArchive(forged)).toThrow(/Checksum mismatch/);
  });
  it("rejects path traversal and unexpected files", () => {
    const evil = zipSync({ "manifest.json": strToU8("{}"), "../../evil.sh": strToU8("rm -rf /") });
    expect(() => archive.readArchive(evil)).toThrow(/unexpected file/);
    expect(archive.isAllowedEntry("media/../../x")).toBe(false);
    expect(archive.isAllowedEntry("bundled/me/photos/a.webp")).toBe(true);
  });
  it("rejects zip bombs and non-zips", () => {
    const bomb = zipSync({ "manifest.json": strToU8("{}"), "media/zeros.bin": new Uint8Array(30 * 1024 * 1024) }, { level: 9 });
    expect(() => archive.readArchive(bomb)).toThrow(/zip bomb/);
    expect(() => archive.readArchive(strToU8("not a zip at all"))).toThrow(/not a backup/);
  });
  it("refuses backups from a newer format", () => {
    const zip = zipSync({ "manifest.json": strToU8(JSON.stringify({ format: archive.BACKUP_FORMAT, formatVersion: 99, files: {} })) });
    expect(() => archive.readArchive(zip)).toThrow(/newer version/);
  });
});

describe("backup → change → restore → undo", () => {
  it("restores the site exactly and the snapshot undoes it", async () => {
    const { db, schema } = dbm;
    const { eq } = await import("drizzle-orm");
    const original = await engine.currentContent();

    const rec = await engine.createBackup({ kind: "manual", options: { bundled: false } });
    expect(rec.summary.counts!.sections).toBe(original.sections.length);

    // simulate a bad update: delete a section, edit settings
    await db.delete(schema.items).where(eq(schema.items.sectionKey, "projects"));
    await db.delete(schema.sections).where(eq(schema.sections.key, "projects"));
    await db.update(schema.settings).set({ value: JSON.stringify({ name: "Broken" }) }).where(eq(schema.settings.key, "profile"));
    const broken = await engine.currentContent();
    expect(broken.sections.find((s) => s.key === "projects")).toBeUndefined();

    const report = await engine.restoreBackup(await engine.openBackup(rec.id), { sections: "all", settings: true, media: false, messages: false });
    const restored = await engine.currentContent();
    expect(restored.sections).toEqual(original.sections);
    expect((restored.settings.profile as { name: string }).name).toBe((original.settings.profile as { name: string }).name);

    // maintenance mode is put back to what it was
    const [m] = await db.select().from(schema.settings).where(eq(schema.settings.key, "maintenance"));
    expect(m ? JSON.parse(m.value).enabled : false).toBe(false);

    // undo → back to the broken state
    await engine.restoreBackup(await engine.openBackup(report.snapshotId), { sections: "all", settings: true, media: false, messages: false });
    const undone = await engine.currentContent();
    expect(undone.sections.map((s) => s.key)).toEqual(broken.sections.map((s) => s.key));
  });

  it("restores only the chosen sections", async () => {
    const { db, schema } = dbm;
    const { eq } = await import("drizzle-orm");
    const rec = await engine.createBackup({ kind: "manual", options: { bundled: false } });
    await db.delete(schema.items).where(eq(schema.items.sectionKey, "skills"));
    await db.delete(schema.items).where(eq(schema.items.sectionKey, "education"));
    await engine.restoreBackup(await engine.openBackup(rec.id), { sections: ["skills"], settings: false, media: false, messages: false });
    const now = await engine.currentContent();
    expect(now.sections.find((s) => s.key === "skills")!.items.length).toBeGreaterThan(0);
    expect(now.sections.find((s) => s.key === "education")!.items.length).toBe(0);
  });

  it("password-protected uploads need the password", async () => {
    const rec = await engine.createBackup({ kind: "manual", options: { bundled: false, media: false } });
    const { bytes } = await engine.exportBackupFile(rec.id, "my very long backup password");
    const up = await engine.storeUploadedBackup(bytes, "upload.zip.enc");
    expect(up.protected).toBe(true);
    await expect(engine.openBackup(up.id)).rejects.toThrow(/password/i);
    const opened = await engine.openBackup(up.id, "my very long backup password");
    expect(opened.manifest.format).toBe(archive.BACKUP_FORMAT);
  });

  it("only one restore can run at a time", async () => {
    const release = await engine.acquireLock("restore", 60_000);
    expect(release).toBeTruthy();
    expect(await engine.acquireLock("restore", 60_000)).toBeNull();
    await release!();
    const again = await engine.acquireLock("restore", 60_000);
    expect(again).toBeTruthy();
    await again!();
  });
});
