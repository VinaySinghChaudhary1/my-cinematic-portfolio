import { z } from "zod";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { attachmentFromBase64, attachmentFromUrl, fillForm } from "@/lib/server/ai/service";
import { aiRateLimit, aiToHttp, attachmentSchema, pickSchema } from "@/lib/server/ai/http";
import type { Attachment } from "@/lib/server/ai/providers";

export const maxDuration = 120;

const schema = z.object({
  target: z.enum(["item", "config", "settings"]),
  sectionType: z.string().max(40).optional(),
  sectionTitle: z.string().max(120).optional(),
  settingsGroup: z.string().max(40).optional(),
  notes: z.string().max(20_000).default(""),
  current: z.record(z.string(), z.unknown()).default({}),
  examples: z.array(z.record(z.string(), z.unknown())).max(3).optional(),
  attachments: z.array(attachmentSchema).max(3).default([]),
  provider: pickSchema,
});

/** Returns suggested values for the form — nothing is saved. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  await aiRateLimit(user);
  const body = schema.parse(await readJson(req, 9_000_000));
  try {
    const attachments: Attachment[] = [];
    for (const a of body.attachments) {
      if ("url" in a) {
        const att = await attachmentFromUrl(a.url);
        if (!att) throw new HttpError(400, `Couldn't read the attached file ${a.url.split("/").pop()}.`, "ai_attachment");
        attachments.push(att);
      } else attachments.push(attachmentFromBase64(a.base64, a.name));
    }
    const result = await fillForm({ ...body, attachments });
    return json({ ok: true, ...result });
  } catch (e) {
    aiToHttp(e);
  }
});
