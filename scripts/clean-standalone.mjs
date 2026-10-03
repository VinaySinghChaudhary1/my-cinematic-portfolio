// Runs after `next build`: removes runtime data that the file tracer may copy into the standalone server folder.
// (The live database, uploads and backups must never ship inside a build.)
import fs from "node:fs";
for (const p of [".next/standalone/data", ".next/standalone/backups", ".next/standalone/content/backups"]) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`✔ removed ${p} from the build output`);
  }
}
