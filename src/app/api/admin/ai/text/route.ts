import { z } from "zod";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { assistText, TEXT_ACTIONS, type TextAction } from "@/lib/server/ai/service";
import { aiRateLimit, aiToHttp, pickSchema } from "@/lib/server/ai/http";

export const maxDuration = 120;

const schema = z.object({
  action: z.enum(Object.keys(TEXT_ACTIONS) as [TextAction, ...TextAction[]]),
  instruction: z.string().max(500).default(""),
  text: z.string().max(20_000).default(""),
  fieldLabel: z.string().max(120),
  markdown: z.boolean().default(false),
  maxLength: z.number().int().positive().max(50_000).optional(),
  context: z.record(z.string(), z.unknown()).default({}),
  provider: pickSchema,
});

export const POST = route(async (req) => {
  const user = await requireAdmin();
  await aiRateLimit(user);
  const body = schema.parse(await readJson(req, 200_000));
  try {
    return json({ ok: true, ...(await assistText(body)) });
  } catch (e) {
    aiToHttp(e);
  }
});
