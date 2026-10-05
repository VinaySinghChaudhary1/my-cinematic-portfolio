import { z } from "zod";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { rateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { audit } from "@/lib/server/auth";
import { startTesterSession, verifyTesterCredentials } from "@/lib/server/tester-auth";
import { HttpError } from "@/lib/server/errors";

const body = z.object({ login: z.string().trim().max(200), password: z.string().max(200) });

export const POST = route(async (req) => {
  const ip = clientIp(req);
  const v = body.parse(await readJson(req, 5_000));
  const key = v.login.toLowerCase();
  await rateLimit(`beta-ip:${ip}`, 30, 15 * 60_000);
  await rateLimit(`beta:${ip}:${key}`, 6, 15 * 60_000);
  const t = await verifyTesterCredentials(key, v.password);
  if (!t) {
    await audit(null, "tester_login_failed", key, ip);
    throw new HttpError(401, "Incorrect username or password — or this access has expired.", "invalid_credentials");
  }
  await resetRateLimit(`beta:${ip}:${key}`);
  await startTesterSession(t);
  await audit(null, "tester_login", t.username, ip);
  return json({ ok: true });
});
