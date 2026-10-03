/** Shared helpers for the backup API routes. */
import { z } from "zod";
import { HttpError } from "../errors";
import { rateLimit } from "../rate-limit";
import { verifyAdminPassword } from "../auth";
import type { UserRow } from "@/db/schema";
import { BackupError } from "./engine";
import { ArchiveError } from "./archive";
import { BackupCryptoError } from "./crypto";

export const CHUNK_BYTES = 4_000_000; // stays under the 4.5 MB request/response limit of serverless hosts
export const MAX_CHUNKS = 300; // 1.2 GB

const sectionsSel = z.union([z.literal("all"), z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(100)]);

export const optionsSchema = z.object({
  sections: sectionsSel.default("all"),
  settings: z.boolean().default(true),
  media: z.boolean().default(true),
  bundled: z.boolean().default(true),
  messages: z.boolean().default(false),
  audit: z.boolean().default(false),
});

export const scopeSchema = z.object({
  sections: sectionsSel,
  settings: z.boolean(),
  media: z.boolean(),
  messages: z.boolean(),
});

/** Admin password re-check with its own rate limit (8 tries / 15 min). */
export async function requireReauth(user: UserRow, password: unknown) {
  await rateLimit(`reauth:${user.id}`, 8, 15 * 60_000);
  if (!(await verifyAdminPassword(user, password))) throw new HttpError(403, "Your admin password is incorrect.", "reauth_failed", { adminPassword: "Incorrect password" });
}

/** Converts engine errors into clean API errors (with the list of problems when there is one). */
export function toHttp(e: unknown): never {
  if (e instanceof HttpError) throw e;
  if (e instanceof BackupError) {
    const fields = e.details.length ? Object.fromEntries(e.details.map((d, i) => [`problem${i + 1}`, d])) : undefined;
    throw new HttpError(e.status === 401 ? 400 : e.status, e.message, e.status === 401 ? "backup_password" : "backup_error", fields);
  }
  if (e instanceof ArchiveError) throw new HttpError(400, e.message, "backup_invalid");
  if (e instanceof BackupCryptoError) throw new HttpError(400, e.message, e.code === "wrong_password" ? "backup_password" : "backup_error");
  throw e;
}

export function downloadName(siteName: string, createdAt: number, encrypted: boolean) {
  const slug = siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "portfolio";
  const d = new Date(createdAt).toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  return `${slug}-backup-${d}${encrypted ? ".zip.enc" : ".zip"}`;
}
