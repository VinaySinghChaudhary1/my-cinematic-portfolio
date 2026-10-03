/**
 * Command-line restore — same checks as Admin → Backups (verify, snapshot first, one transaction).
 *
 *   npm run restore -- backups/my-backup.zip                 # preview only (changes nothing)
 *   npm run restore -- backups/my-backup.zip --yes           # restore everything
 *   npm run restore -- file.zip.enc --password "…" --yes
 *   npm run restore -- file.zip --yes --only projects,skills --no-settings --no-media --messages
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const root = process.cwd();
loadEnv({ path: path.join(root, ".env.local"), quiet: true });
loadEnv({ path: path.join(root, ".env"), quiet: true });

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const value = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((a, i) => !a.startsWith("--") && !["--password", "--only"].includes(args[i - 1] ?? ""));

async function main() {
  if (!file) throw new Error("Usage: npm run restore -- <backup file> [--password …] [--yes]");
  const bytes = new Uint8Array(fs.readFileSync(path.resolve(root, file)));
  const { ensureSchema } = await import("../src/db/index");
  const { storeUploadedBackup, openBackup, previewRestore, restoreBackup, deleteBackup } = await import("../src/lib/server/backup/engine");
  await ensureSchema();
  const rec = await storeUploadedBackup(bytes, path.basename(file));
  try {
    const archive = await openBackup(rec.id, value("password"));
    const p = await previewRestore(archive);
    console.log(`Backup from ${p.manifest.createdAt} (v${p.manifest.appVersion}, ${p.manifest.siteUrl || "unknown site"})`);
    for (const s of p.sections) console.log(`  ${s.title.padEnd(22)} now ${String(s.currentItems ?? "new").padStart(4)}  →  backup ${String(s.backupItems).padStart(4)}`);
    console.log(`  media ${p.media.total} (${p.media.alreadyHere} already here) · messages ${p.messages.total} · settings groups ${p.settingsGroups.length}`);
    if (!flag("yes")) {
      console.log("\nPreview only. Add --yes to restore (a snapshot of the current site is taken first).");
      await deleteBackup(rec.id);
      return;
    }
    const only = value("only");
    const report = await restoreBackup(archive, {
      sections: only ? only.split(",").map((s) => s.trim()) : "all",
      settings: !flag("no-settings"),
      media: !flag("no-media"),
      messages: flag("messages"),
    }, { actorId: null });
    console.log(`\n✔ Restored ${report.sections} sections (${report.items} items), ${report.settingsGroups} settings groups, ${report.mediaAdded} media added.`);
    console.log(`  Undo: Admin → Backups → "Auto snapshot" (${report.snapshotId}) → Restore.`);
    for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  } catch (e) {
    await deleteBackup(rec.id);
    throw e;
  }
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  if (e && typeof e === "object" && "details" in e && Array.isArray((e as { details: string[] }).details)) for (const d of (e as { details: string[] }).details) console.error("   •", d);
  process.exit(1);
});
