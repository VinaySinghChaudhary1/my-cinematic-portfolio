import { z } from "zod";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { mapLinkedIn } from "@/lib/import/linkedin";
import { buildReview, importTargets } from "@/lib/server/import";
import { attachmentFromBase64, extractEntries } from "@/lib/server/ai/service";
import { aiRateLimit, aiToHttp, pickSchema } from "@/lib/server/ai/http";

export const maxDuration = 180;

const schema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("linkedin"), files: z.record(z.string().max(120), z.string().max(1_500_000)) }),
  z.object({
    mode: z.literal("ai"),
    notes: z.string().max(40_000).default(""),
    attachment: z.object({ name: z.string().max(200), base64: z.string().max(4_200_000) }).optional(),
    provider: pickSchema,
  }),
]);

/** Turns a LinkedIn export or a résumé into a review list. Nothing is saved. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  const body = schema.parse(await readJson(req, 4_400_000));
  if (body.mode === "linkedin") {
    const { candidates, used } = mapLinkedIn(body.files);
    if (!used.length) throw new HttpError(400, "No LinkedIn files found. Use the ZIP from LinkedIn → Settings → Data privacy → Get a copy of your data.", "import_empty");
    return json({ ok: true, entries: await buildReview(candidates), used });
  }
  await aiRateLimit(user);
  try {
    const attachments = body.attachment ? [attachmentFromBase64(body.attachment.base64, body.attachment.name)] : [];
    const r = await extractEntries({ notes: body.notes, attachments, targets: await importTargets(), provider: body.provider });
    const entries = await buildReview(r.entries.map((e) => ({ ...e, source: "Résumé (AI)" })));
    return json({ ok: true, entries, provider: r.provider, model: r.model, failed: r.failed });
  } catch (e) {
    aiToHttp(e);
  }
});
