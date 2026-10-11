import { z } from "zod";
import { route, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { HttpError } from "@/lib/server/errors";
import { runDomainCheck } from "@/lib/server/move";

export const maxDuration = 60;

/** Live DNS + HTTPS check of a domain against this site (Admin → Move & domain). */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`domain-check:${user.id}`, 60, 60 * 60_000);
  const { domain } = z.object({ domain: z.string().trim().min(3).max(253) }).parse(await readJson(req));
  try {
    return json({ ok: true, ...(await runDomainCheck(domain)) });
  } catch (e) {
    throw new HttpError(400, e instanceof Error ? e.message : "Check failed", "validation", { domain: "Enter a domain like yourname.com" });
  }
});
