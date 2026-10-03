import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { makeImage, IMAGE_KINDS, type ImageKind } from "@/lib/server/ai/service";
import { aiRateLimit, aiToHttp, pickSchema } from "@/lib/server/ai/http";

export const maxDuration = 180;

const schema = z.object({
  kind: z.enum(Object.keys(IMAGE_KINDS) as [ImageKind, ...ImageKind[]]),
  description: z.string().max(2000).default(""),
  values: z.record(z.string(), z.unknown()).default({}),
  sectionType: z.string().max(40).optional(),
  provider: pickSchema,
});

/** Generates an image, stores it in the media library and returns it. The form only uses it when you save. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  await aiRateLimit(user);
  const body = schema.parse(await readJson(req, 200_000));
  try {
    const out = await makeImage(body);
    await audit(user.id, "ai_image_generated", `${body.kind} · ${out.media.filename}`, clientIp(req));
    return json({ ok: true, ...out }, { status: 201 });
  } catch (e) {
    aiToHttp(e);
  }
});
