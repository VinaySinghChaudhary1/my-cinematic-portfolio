import { z } from "zod";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { rateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { verifyCredentials, startSession, audit } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";

const body = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

export const POST = route(async (req) => {
  const ip = clientIp(req);
  const { email, password } = body.parse(await readJson(req, 10_000));
  const emailKey = email.toLowerCase();
  await rateLimit(`login-ip:${ip}`, 30, 15 * 60_000);
  await rateLimit(`login:${ip}:${emailKey}`, 6, 15 * 60_000);

  const user = await verifyCredentials(emailKey, password);
  if (!user) {
    await audit(null, "login_failed", emailKey, ip);
    // Same message for unknown email, wrong password and locked account → no account enumeration.
    throw new HttpError(401, "Incorrect email or password.", "invalid_credentials");
  }
  await resetRateLimit(`login:${ip}:${emailKey}`);
  await startSession(user);
  await audit(user.id, "login", "", ip);
  return json({ ok: true });
});
