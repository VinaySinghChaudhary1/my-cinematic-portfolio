/**
 * Command-line backups — same engine as Admin → Backups. Works against local SQLite or Turso (.env.local).
 *
 *   npm run backup                                  # full backup → backups/<name>.zip (also kept in Admin → Backups)
 *   npm run backup -- --password "long passphrase"   # encrypted .zip.enc
 *   npm run backup -- --messages --audit --no-media  # choose what goes in
 *   npm run backup -- --out D:/Backups               # other folder
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

async function main() {
  const { ensureSchema } = await import("../src/db/index");
  const { createBackup, exportBackupFile } = await import("../src/lib/server/backup/engine");
  const { getSettings } = await import("../src/lib/server/content");
  const { downloadName } = await import("../src/lib/server/backup/api");
  await ensureSchema();
  const rec = await createBackup({
    kind: "cli",
    label: value("label") ?? "Command-line backup",
    options: { sections: "all", settings: true, media: !flag("no-media"), bundled: !flag("no-bundled"), messages: flag("messages"), audit: flag("audit") },
  });
  const password = value("password");
  const { bytes, encrypted } = await exportBackupFile(rec.id, password);
  const outDir = path.resolve(root, value("out") ?? "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, downloadName((await getSettings()).profile.name, rec.createdAt, encrypted));
  fs.writeFileSync(file, bytes);
  const c = rec.summary.counts!;
  console.log(`✔ Backup saved: ${path.relative(root, file)} (${(bytes.byteLength / 1048576).toFixed(1)} MB${encrypted ? ", encrypted" : ""})`);
  console.log(`  ${c.sections} sections · ${c.items} items · ${c.media} media · ${c.bundled} site files · ${c.messages} messages`);
  for (const w of rec.summary.warnings ?? []) console.log(`  ⚠ ${w}`);
  if (!encrypted) console.log("  Tip: add --password \"…\" to encrypt the file.");
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
