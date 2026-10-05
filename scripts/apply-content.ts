/**
 * Replace the site's content with a JSON content file.
 *
 *   npm run content:apply                         # applies content/vinay.json
 *   npm run content:apply -- content/other.json   # any other file
 *   npm run content:apply -- --dry-run            # validate only, change nothing
 *   npm run content:export                        # save current DB content to content/backups/
 *
 * Works against the local SQLite file or Turso — whatever DATABASE_URL in .env.local points to.
 * Admin accounts, uploaded media, messages and the audit log are never touched.
 * A backup of the current content is written to content/backups/ before anything is replaced.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config as loadEnv } from "dotenv";

const root = process.cwd();
loadEnv({ path: path.join(root, ".env.local"), quiet: true });
loadEnv({ path: path.join(root, ".env"), quiet: true });
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "file:./data/portfolio.db";
fs.mkdirSync(path.join(root, "data"), { recursive: true });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const exportOnly = args.includes("--export");
const file = args.find((a) => !a.startsWith("--")) ?? "content/vinay.json";

async function exportCurrent(label: string) {
  const { db, schema } = await import("../src/db/index");
  const { itemMeta } = await import("../src/lib/content-import");
  const secs = await db.select().from(schema.sections);
  const its = await db.select().from(schema.items);
  const { SETTINGS_GROUPS } = await import("../src/lib/settings-def");
  const groups = new Set(SETTINGS_GROUPS.map((g) => g.key));
  const sets = (await db.select().from(schema.settings)).filter((s) => groups.has(s.key));
  const out = {
    version: 1,
    exported: new Date().toISOString(),
    settings: Object.fromEntries(sets.map((s) => [s.key, JSON.parse(s.value)])),
    sections: secs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        key: s.key,
        type: s.type,
        title: s.title,
        subtitle: s.subtitle,
        enabled: s.enabled,
        showInNav: s.showInNav,
        ...(s.audience === "beta" ? { audience: "beta" } : {}),
        config: JSON.parse(s.config),
        items: its
          .filter((i) => i.sectionKey === s.key)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) => ({ ...itemMeta(i), ...JSON.parse(i.data) })),
      })),
  };
  const dir = path.join(root, "content", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
  return path.relative(root, target);
}

async function main() {
  const { ensureSchema } = await import("../src/db/index");
  await ensureSchema();

  if (exportOnly) {
    console.log(`✔ Exported current content → ${await exportCurrent("export")}`);
    return;
  }

  const abs = path.resolve(root, file);
  if (!fs.existsSync(abs)) throw new Error(`Content file not found: ${file}`);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${(e as Error).message}`);
  }

  const { parseContent } = await import("../src/lib/content-import");
  const parsed = parseContent(raw);
  if (!parsed.ok) {
    console.error(`✖ ${file} has ${parsed.errors.length} problem(s):`);
    parsed.errors.forEach((e) => console.error("   • " + e));
    process.exit(1);
  }
  const { content } = parsed;

  const missing = content.assets.filter((a) => !fs.existsSync(path.join(root, "public", decodeURI(a))));
  if (missing.length) {
    console.error(`✖ ${missing.length} referenced file(s) are missing from public/:`);
    missing.forEach((m) => console.error("   • " + m));
    process.exit(1);
  }

  const itemCount = content.sections.reduce((n, s) => n + s.items.length, 0);
  console.log(`✔ ${file} is valid — ${content.sections.length} sections, ${itemCount} items, ${Object.keys(content.settings).length} settings groups, ${content.assets.length} local files`);
  for (const s of content.sections)
    console.log(`   ${s.enabled ? "●" : "○"} ${s.key.padEnd(15)} ${String(s.config.layout ?? "").padEnd(10)} ${s.items.length} item(s)${s.enabled ? "" : "  (hidden)"}`);
  if (dryRun) {
    console.log("Dry run — nothing was changed.");
    return;
  }

  const backup = await exportCurrent("before-apply");
  console.log(`✔ Backed up current content → ${backup}`);
  try {
    const { createBackup } = await import("../src/lib/server/backup/engine");
    const snap = await createBackup({ kind: "pre-restore", label: `Automatic snapshot before content:apply (${path.basename(file)})`, options: { sections: "all", settings: true, media: false, bundled: false, messages: false, audit: false } });
    console.log(`✔ Snapshot kept in Admin → Backups (${snap.id.slice(0, 8)}) — restore it there to undo`);
  } catch (e) {
    console.warn(`⚠ Could not save an Admin → Backups snapshot (${e instanceof Error ? e.message : e}); the JSON backup above still works.`);
  }

  const { db, schema } = await import("../src/db/index");
  const { DEFAULT_SETTINGS } = await import("../src/lib/settings-def");
  const t = Date.now();

  const existing = Object.fromEntries((await db.select().from(schema.settings)).map((s) => [s.key, JSON.parse(s.value)]));
  await db.transaction(async (tx) => {
    await tx.delete(schema.items);
    await tx.delete(schema.sections);
    let order = 0;
    for (const s of content.sections) {
      await tx.insert(schema.sections).values({
        key: s.key,
        type: s.type,
        title: s.title,
        subtitle: s.subtitle,
        enabled: s.enabled,
        showInNav: s.showInNav,
        audience: s.audience,
        sortOrder: order++,
        config: JSON.stringify(s.config),
        updatedAt: t,
      });
      let i = 0;
      for (const it of s.items) {
        await tx.insert(schema.items).values({
          id: crypto.randomUUID(),
          sectionKey: s.key,
          data: JSON.stringify(it.data),
          visible: it.visible,
          featured: it.featured,
          status: it.status,
          publishAt: it.publishAt,
          sortOrder: i,
          createdAt: t + i,
          updatedAt: t + i,
        });
        i++;
      }
    }
    for (const [group, value] of Object.entries(content.settings)) {
      // Merge: defaults ← current values ← file values (so groups/fields you leave out keep working).
      const merged = { ...((DEFAULT_SETTINGS as unknown as Record<string, object>)[group] ?? {}), ...(existing[group] ?? {}), ...value };
      await tx
        .insert(schema.settings)
        .values({ key: group, value: JSON.stringify(merged), updatedAt: t })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value: JSON.stringify(merged), updatedAt: t } });
    }
  });
  console.log("✔ Content applied. Refresh the site — no rebuild needed for text changes.");
  console.log("  (New files added under public/ need a rebuild/redeploy before `npm start` or Vercel can serve them.)");
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
