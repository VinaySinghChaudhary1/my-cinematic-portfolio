import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { saveSettingsGroup } from "@/lib/server/content";
import { NotFound } from "@/lib/server/errors";
import { SETTINGS_GROUPS } from "@/lib/settings-def";
import { schemaFromFields } from "@/lib/validation";

export const PUT = route<{ group: string }>(async (req, { params }) => {
  const user = await requireAdmin();
  const { group } = await params;
  const def = SETTINGS_GROUPS.find((g) => g.key === group);
  if (!def) throw NotFound("Settings group");
  const value = schemaFromFields(def.fields).parse(await readJson(req));
  await saveSettingsGroup(group, value);
  await audit(user.id, "settings_updated", group, clientIp(req));
  return json({ ok: true, value });
});
