import { z } from "zod";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { HttpError } from "@/lib/server/errors";
import { rateLimit } from "@/lib/server/rate-limit";
import { getViewer } from "@/lib/server/viewer";
import { getAiConfig } from "@/lib/server/ai/config";
import { answerChat } from "@/lib/server/ai/service";

export const maxDuration = 60;

const schema = z.object({
  question: z.string().trim().min(2, "Type a question").max(500, "Keep questions under 500 characters"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(12)
    .default([]),
});

/**
 * "Ask about me" — answers from the published site content only. Nothing is stored (no transcripts);
 * only token counts go into the AI usage log, like every other AI task.
 */
export const POST = route(async (req) => {
  const cfg = await getAiConfig();
  const viewer = await getViewer();
  const allowed = cfg.chat.mode === "public" || (cfg.chat.mode === "beta" && viewer.kind !== "public");
  if (!allowed) throw new HttpError(404, "The chat is not available.", "not_found");
  const body = schema.parse(await readJson(req, 40_000));

  if (viewer.kind !== "admin") {
    try {
      await rateLimit(`chat:ip:${clientIp(req)}`, cfg.chat.perVisitorHourly, 60 * 60_000);
    } catch {
      throw new HttpError(429, "You've asked a lot of questions — please try again in a while, or use the contact form.", "rate_limited");
    }
    try {
      await rateLimit("chat:day", cfg.chat.dailyCap, 24 * 60 * 60_000);
    } catch {
      throw new HttpError(429, "The assistant is taking a break for today. Please use the contact form instead.", "rate_limited");
    }
  }

  try {
    const answer = await answerChat({ question: body.question, history: body.history, mode: viewer.kind === "public" ? "public" : "beta" });
    return json({ ok: true, answer });
  } catch (e) {
    console.error("[chat] failed", e instanceof Error ? e.message : e);
    // Provider details (quota, keys, models) are for the owner's usage log, not for visitors.
    throw new HttpError(503, viewer.kind === "admin" ? `Chat failed: ${e instanceof Error ? e.message : "unknown error"}` : "The assistant can't answer right now. Please try again later or use the contact form.", "chat_unavailable");
  }
});
