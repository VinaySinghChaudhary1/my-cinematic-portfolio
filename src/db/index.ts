import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { MIGRATIONS } from "./migrations";

type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB; __client?: Client; __migrated?: Promise<void> };

function makeClient(): Client {
  const url = process.env.DATABASE_URL || "file:./data/portfolio.db";
  if (process.env.NODE_ENV === "production" && process.env.VERCEL && url.startsWith("file:")) {
    console.warn(
      "[db] DATABASE_URL points to a local file on Vercel — data will NOT persist. Use a Turso URL (see docs/DEPLOYMENT.md).",
    );
  }
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
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
    })().catch((e) => {
      globalForDb.__migrated = undefined;
      throw e;
    });
  }
  return globalForDb.__migrated;
}

export { schema };
