import { z } from "zod";
import { HttpError } from "../errors";
import { rateLimit } from "../rate-limit";
import type { UserRow } from "@/db/schema";
import { AiError } from "./providers";
import { isSlotId, type ProviderId } from "./config";

/** Generous limit — protects against runaway loops, not a budget (your provider's own limits apply). */
export const aiRateLimit = (user: UserRow) => rateLimit(`ai:${user.id}`, 300, 60 * 60_000);

export function aiToHttp(e: unknown): never {
  if (e instanceof AiError) throw new HttpError(e.status === 401 ? 400 : e.status, e.message, `ai_${e.kind}`);
  throw e;
}

export function providerParam(id: string): ProviderId {
  if (!isSlotId(id)) throw new HttpError(404, "Unknown AI provider.", "not_found");
  return id;
}

/** Optional per-request choice: "auto" (the order in Admin → AI), "svg", or a provider slot id. */
export const pickSchema = z
  .string()
  .max(20)
  .refine((v) => v === "auto" || v === "svg" || isSlotId(v), "Unknown AI provider")
  .optional();

export const attachmentSchema = z.union([
  z.object({ url: z.string().max(2048) }),
  z.object({ name: z.string().max(200), base64: z.string().max(4_200_000) }),
]);

/** Any current or future model name (e.g. "openrouter/free", "meta-llama/llama-4:free", "llama3.2:latest"). */
export const modelField = z.string().trim().max(120).regex(/^[\w.:/@~-]*$/, "Letters, numbers and . : / @ ~ - only").optional();
