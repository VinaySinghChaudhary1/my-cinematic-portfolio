import { route, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { getAiConfig, resolveProvider } from "@/lib/server/ai/config";
import { generateText } from "@/lib/server/ai/providers";
import { logUsage } from "@/lib/server/ai/service";
import { aiRateLimit, aiToHttp, providerParam } from "@/lib/server/ai/http";

export const maxDuration = 60;

/** Sends a tiny request with the saved key + text model, so you know it works (and see the provider's own error if not). */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireAdmin();
  await aiRateLimit(user);
  const id = providerParam((await params).id);
  const r = resolveProvider(await getAiConfig(), id);
  if (!r) throw new HttpError(400, "Save an API key for this provider first.", "ai_not_configured");
  const started = Date.now();
  try {
    const out = await generateText(r, { system: "You are a connection test.", prompt: "Reply with exactly: OK" });
    await logUsage(r, r.textModel, "test", out.usage);
    return json({ ok: true, reply: out.text.trim().slice(0, 40), model: r.textModel, ms: Date.now() - started });
  } catch (e) {
    await logUsage(r, r.textModel, "test", null, e);
    aiToHttp(e);
  }
});
