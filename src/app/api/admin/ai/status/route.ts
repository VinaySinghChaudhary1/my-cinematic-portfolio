import { route, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { capabilities, getAiConfig, resolveProvider } from "@/lib/server/ai/config";

/** Light check used by the editor buttons: is AI ready, which providers can be picked, and how are images made? */
export const GET = route(async () => {
  await requireAdmin();
  const cfg = await getAiConfig();
  const options = Object.keys(cfg.providers)
    .map((id) => resolveProvider(cfg, id))
    .filter((r) => !!r)
    .map((r) => ({ id: r.id, label: r.label, textModel: r.textModel, imageModel: capabilities(r).hasImageModel ? r.imageModel : "", ...capabilities(r) }));
  const text = cfg.textOrder.map((id) => options.find((o) => o.id === id)).filter((o) => !!o && !!o.textModel);
  const rasterIds = cfg.imageOrder.filter((id) => id !== "svg" && options.some((o) => o.id === id && o.imageModel));
  return json({
    ok: true,
    ready: text.length > 0,
    provider: text[0]?.label ?? "",
    model: text[0]?.textModel ?? "",
    images: rasterIds.length ? "raster" : text.length ? "svg" : "none",
    fallback: cfg.fallback,
    textOrder: text.map((o) => o!.id),
    imageOrder: cfg.imageOrder.filter((id) => id === "svg" || rasterIds.includes(id)),
    options,
  });
});
