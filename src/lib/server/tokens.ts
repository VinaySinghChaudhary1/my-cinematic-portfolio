/** Single-use secret tokens (password reset links). Only a SHA-256 hash is stored, so a DB leak can't be replayed. */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId } from "./ids";

export type TokenKind = "admin" | "tester";
export const RESET_TTL_MS = 30 * 60_000;

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createResetToken(kind: TokenKind, subjectId: string): Promise<string> {
  const now = Date.now();
  // Older unused links for the same account stop working as soon as a new one is requested.
  await db
    .update(schema.authTokens)
    .set({ usedAt: now })
    .where(and(eq(schema.authTokens.kind, kind), eq(schema.authTokens.subjectId, subjectId), isNull(schema.authTokens.usedAt)));
  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.authTokens).values({ id: newId(), kind, subjectId, purpose: "reset", tokenHash: hash(token), expiresAt: now + RESET_TTL_MS, createdAt: now });
  return token;
}

/** Returns the token's owner if it is valid, unused and not expired — without using it up. */
export async function peekResetToken(token: string) {
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return null;
  const [row] = await db
    .select()
    .from(schema.authTokens)
    .where(and(eq(schema.authTokens.tokenHash, hash(token)), isNull(schema.authTokens.usedAt), gt(schema.authTokens.expiresAt, Date.now())))
    .limit(1);
  return row && row.purpose === "reset" ? { id: row.id, kind: row.kind as TokenKind, subjectId: row.subjectId } : null;
}

/** Atomically marks the token used; returns false if someone else used it first. */
export async function consumeToken(id: string): Promise<boolean> {
  const res = await db
    .update(schema.authTokens)
    .set({ usedAt: Date.now() })
    .where(and(eq(schema.authTokens.id, id), isNull(schema.authTokens.usedAt)))
    .returning({ id: schema.authTokens.id });
  return res.length === 1;
}
