import { z } from "zod";
import { route, json, clientIp, readJson } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { CHAT_MODES, getAiConfig, isSlotId, publicAiConfig, saveAiConfig } from "@/lib/server/ai/config";
import { usageSummary } from "@/lib/server/ai/service";

export const GET = route(async () => {
  await requireAdmin();
  return json({ ok: true, config: publicAiConfig(await getAiConfig()), usage: await usageSummary() });
});

const slot = z.string().max(20).refine(isSlotId, "Unknown AI provider");
const schema = z.object({
  textOrder: z.array(slot).max(20).optional(),
  imageOrder: z.array(z.union([slot, z.literal("svg")])).max(21).optional(),
  fallback: z.boolean().optional(),
  styleNotes: z.string().trim().max(500).optional(),
  chat: z
    .object({
      mode: z.enum(CHAT_MODES),
      greeting: z.string().trim().max(200),
      notes: z.string().trim().max(2000),
      provider: z.string().max(20).refine((v) => v === "auto" || isSlotId(v), "Unknown AI provider"),
      perVisitorHourly: z.number().int().min(1).max(100),
      dailyCap: z.number().int().min(1).max(5000),
    })
    .optional(),
});

/** Saves the order providers are tried in, the fallback switch and image style notes. */
export const PUT = route(async (req) => {
  const user = await requireAdmin();
  const body = schema.parse(await readJson(req));
  const cfg = await getAiConfig();
  const patch = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
  await saveAiConfig({ ...cfg, ...patch });
  const saved = await getAiConfig();
  await audit(user.id, "ai_settings_saved", `text=${saved.textOrder.join(">") || "none"} image=${saved.imageOrder.join(">") || "none"} fallback=${saved.fallback ? "on" : "off"} chat=${saved.chat.mode}`, clientIp(req));
  return json({ ok: true, config: publicAiConfig(saved) });
});
