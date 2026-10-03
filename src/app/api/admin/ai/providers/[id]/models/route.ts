import { route, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { getAiConfig, resolveProvider } from "@/lib/server/ai/config";
import { listModels } from "@/lib/server/ai/providers";
import { aiRateLimit, aiToHttp, providerParam } from "@/lib/server/ai/http";

/** Lists the models your key can use — so new models show up without a site update. */
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireAdmin();
  await aiRateLimit(user);
  const id = providerParam((await params).id);
  const r = resolveProvider(await getAiConfig(), id);
  if (!r) throw new HttpError(400, "Save an API key for this provider first.", "ai_not_configured");
  try {
    return json({ ok: true, models: (await listModels(r)).slice(0, 400) });
  } catch (e) {
    aiToHttp(e);
  }
});
