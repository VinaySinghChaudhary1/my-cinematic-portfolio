import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { getAiConfig, isSlotId, publicAiConfig, saveAiConfig } from "@/lib/server/ai/config";
import { usageSummary } from "@/lib/server/ai/service";

export const GET = route(async () => {
  await requireAdmin();
  return json({ ok: true, config: publicAiConfig(await getAiConfig()), usage: await usageSummary() });
});

const slot = z.string().max(20).refine(isSlotId, "Unknown AI provider");
const schema = z.object({
  textOrder: z.array(slot).max(20),
  imageOrder: z.array(z.union([slot, z.literal("svg")])).max(21),
  fallback: z.boolean(),
  styleNotes: z.string().trim().max(500).default(""),
});

/** Saves the order providers are tried in, the fallback switch and image style notes. */
export const PUT = route(async (req) => {
  const user = await requireAdmin();
  const body = schema.parse(await readJson(req));
  const cfg = await getAiConfig();
  await saveAiConfig({ ...cfg, ...body, publicChat: false });
  const saved = await getAiConfig();
  await audit(user.id, "ai_settings_saved", `text=${saved.textOrder.join(">") || "none"} image=${saved.imageOrder.join(">") || "none"} fallback=${saved.fallback ? "on" : "off"}`, clientIp(req));
  return json({ ok: true, config: publicAiConfig(saved) });
});
