import { z } from "zod";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { requireReauth, toHttp } from "@/lib/server/backup/api";
import { activeTransfer, cancelTransfers, createTransfer } from "@/lib/server/move";

export const maxDuration = 300;

/** Is a transfer code active? (The code itself is shown only once, when it is created.) */
export const GET = route(async () => {
  await requireAdmin();
  return json({ ok: true, active: await activeTransfer() });
});

const createSchema = z.object({ adminPassword: z.string().min(1).max(200), includeMessages: z.boolean().default(false) });

/** Makes a full backup and a one-time transfer code (2 hours) the new site uses to copy everything. */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  const body = createSchema.parse(await readJson(req));
  await requireReauth(user, body.adminPassword);
  try {
    const t = await createTransfer({ includeMessages: body.includeMessages, origin: req.nextUrl.origin });
    await audit(user.id, "transfer_created", `${t.size} bytes · ${t.parts} part(s)`, clientIp(req));
    return json({ ok: true, code: t.code, expiresAt: t.expiresAt, size: t.size, parts: t.parts });
  } catch (e) {
    toHttp(e);
  }
});

/** Cancels the active code immediately. */
export const DELETE = route(async (req) => {
  const user = await requireAdmin();
  const n = await cancelTransfers();
  await audit(user.id, "transfer_cancelled", String(n), clientIp(req));
  return json({ ok: true });
});
