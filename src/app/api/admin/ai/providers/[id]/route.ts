import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { getAiConfig, publicAiConfig, saveAiConfig, setProviderKey } from "@/lib/server/ai/config";
import { compatibleBase } from "@/lib/server/ai/providers";
import { aiToHttp, modelField, providerParam } from "@/lib/server/ai/http";

const schema = z.object({
  key: z.string().trim().max(500).optional(),
  label: z.string().trim().max(40).optional(),
  textModel: modelField,
  imageModel: modelField,
  baseUrl: z.string().trim().max(300).optional(),
});

/** Save a provider's key / models. The key is encrypted immediately and never sent back. */
export const PUT = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const id = providerParam((await params).id);
  const body = schema.parse(await readJson(req, 20_000));
  const cfg = await getAiConfig();
  // extra OpenAI-compatible services are created with POST /providers first
  if (id.startsWith("c-") && !cfg.providers[id]) throw new HttpError(404, "This provider was removed. Reload the page.", "not_found");
  if (body.baseUrl) {
    try {
      compatibleBase(body.baseUrl);
    } catch (e) {
      aiToHttp(e);
    }
  }
  const isCompatible = id === "compatible" || id.startsWith("c-");
  await saveAiConfig(setProviderKey(cfg, id, isCompatible ? body : { ...body, baseUrl: undefined, label: undefined }));
  await audit(user.id, "ai_provider_saved", `${id}${body.key ? " (new key)" : ""}`, clientIp(req));
  return json({ ok: true, config: publicAiConfig(await getAiConfig()) });
});

export const DELETE = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const id = providerParam((await params).id);
  await saveAiConfig(setProviderKey(await getAiConfig(), id, { remove: true }));
  await audit(user.id, "ai_provider_removed", id, clientIp(req));
  return json({ ok: true, config: publicAiConfig(await getAiConfig()) });
});
