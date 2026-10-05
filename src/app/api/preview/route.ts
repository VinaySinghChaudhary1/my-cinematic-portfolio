import { z } from "zod";
import { cookies } from "next/headers";
import { route, json, readJson } from "@/lib/server/http";
import { getViewer, PREVIEW_COOKIE } from "@/lib/server/viewer";
import { HttpError } from "@/lib/server/errors";

/** Switches "show drafts & scheduled entries" on or off for the admin or a tester who is allowed to preview. */
export const POST = route(async (req) => {
  const { on } = z.object({ on: z.boolean() }).parse(await readJson(req, 1000));
  const v = await getViewer();
  if (!v.canPreview) throw new HttpError(403, "Preview isn't available for this account.", "forbidden");
  (await cookies()).set(PREVIEW_COOKIE, on ? "1" : "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: on ? 24 * 3600 : 0 });
  return json({ ok: true, on });
});
