import { client } from "@/db";
import { route, json } from "@/lib/server/http";
import { siteFingerprint } from "@/lib/server/instance";

export const GET = route(async () => {
  await client.execute("SELECT 1");
  // `site` is a short anonymous fingerprint of this database — the Domain checker uses it to recognise this site.
  return json({ ok: true, status: "healthy", site: await siteFingerprint(), time: new Date().toISOString() });
}, { csrf: false });
