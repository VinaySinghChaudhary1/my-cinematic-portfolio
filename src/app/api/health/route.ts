import { client } from "@/db";
import { route, json } from "@/lib/server/http";

export const GET = route(async () => {
  await client.execute("SELECT 1");
  return json({ ok: true, status: "healthy", time: new Date().toISOString() });
}, { csrf: false });
