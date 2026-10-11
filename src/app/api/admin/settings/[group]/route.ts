import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { saveSettingsGroup } from "@/lib/server/content";
import { HttpError, NotFound } from "@/lib/server/errors";
import { normalizeSiteUrl } from "@/lib/site-url";
import { SETTINGS_GROUPS } from "@/lib/settings-def";
import { schemaFromFields } from "@/lib/validation";

export const PUT = route<{ group: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { group } = await params;
  const def = SETTINGS_GROUPS.find((g) => g.key === group);
  if (!def) throw NotFound("Settings group");
  const value = schemaFromFields(def.fields).parse(await readJson(req)) as Record<string, unknown>;
  if (group === "domain" && value.siteUrl) {
    const origin = normalizeSiteUrl(value.siteUrl);
    if (!origin) throw new HttpError(400, "Enter the full address starting with https://, e.g. https://yourname.com", "validation", { siteUrl: "Use https://yourname.com" });
    value.siteUrl = origin;
  }
  await saveSettingsGroup(group, value);
  await audit(user.id, "settings_updated", group, clientIp(req));
  return json({ ok: true, value });
});
