import { route, json, clientIp } from "@/lib/server/http";
import { endSession, getCurrentUser, audit } from "@/lib/server/auth";

export const POST = route(async (req) => {
  const user = await getCurrentUser();
  await endSession();
  if (user) await audit(user.id, "logout", "", clientIp(req));
  return json({ ok: true });
});
