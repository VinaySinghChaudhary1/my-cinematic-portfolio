/** Runs once when a Next.js server instance starts (any host). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  try {
    const { bootstrap } = await import("./lib/server/bootstrap");
    await bootstrap();
  } catch (e) {
    console.error("[bootstrap] failed — check DATABASE_URL / DATA_DIR", e);
  }
  const { startInternalScheduler } = await import("./lib/server/backup/scheduler");
  startInternalScheduler();
}
