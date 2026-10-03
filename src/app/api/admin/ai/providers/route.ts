import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { getAiConfig, newCompatibleId, publicAiConfig, saveAiConfig, setProviderKey } from "@/lib/server/ai/config";
import { compatibleBase } from "@/lib/server/ai/providers";
import { aiToHttp, modelField } from "@/lib/server/ai/http";

const schema = z.object({
  label: z.string().trim().min(1, "Give it a name").max(40),
  baseUrl: z.string().trim().min(1, "Enter the base URL").max(300),
  key: z.string().trim().max(500).optional(),
  textModel: modelField,
  imageModel: modelField,
});

/** Adds another OpenAI-compatible service (OpenRouter, Groq, Together, Ollama…). */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  const body = schema.parse(await readJson(req, 20_000));
  try {
    compatibleBase(body.baseUrl);
  } catch (e) {
    aiToHttp(e);
  }
  const cfg = await getAiConfig();
  let id: string;
  try {
    id = newCompatibleId(cfg);
  } catch (e) {
    throw new HttpError(400, e instanceof Error ? e.message : "Too many providers", "ai_limit");
  }
  await saveAiConfig(setProviderKey(cfg, id, body));
  await audit(user.id, "ai_provider_added", `${id} ${body.label}`, clientIp(req));
  return json({ ok: true, id, config: publicAiConfig(await getAiConfig()) }, { status: 201 });
});
