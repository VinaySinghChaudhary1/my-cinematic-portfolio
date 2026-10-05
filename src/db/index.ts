import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { COLUMN_MIGRATIONS, MIGRATIONS } from "./migrations";

type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB; __client?: Client; __migrated?: Promise<void> };

function makeClient(): Client {
  const dataDir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "data");
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || `file:${path.join(dataDir, "portfolio.db")}`;
  if (url.startsWith("file:")) {
    try {
      fs.mkdirSync(path.dirname(path.resolve(/*turbopackIgnore: true*/ url.slice(5))), { recursive: true });
    } catch {
      /* read-only FS: the client will report a clear error */
    }
    if (process.env.NODE_ENV === "production" && (process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
      console.warn("[db] DATABASE_URL points to a local file on a serverless host — data will NOT persist. Use a Turso / libSQL URL (see DEPLOYMENT.md).");
    }
  }
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined });
}

export const client: Client = globalForDb.__client ?? makeClient();
export const db: DB = globalForDb.__db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__client = client;
  globalForDb.__db = db;
}

/** Idempotent schema bootstrap — safe to call on every cold start. */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__migrated) {
    globalForDb.__migrated = (async () => {
      for (const stmt of MIGRATIONS) await client.execute(stmt);
      for (const stmt of COLUMN_MIGRATIONS) {
        try {
          await client.execute(stmt);
        } catch (e) {
          if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
        }
      }
    })().catch((e) => {
      globalForDb.__migrated = undefined;
      throw e;
    });
  }
  return globalForDb.__migrated;
}

export { schema };
