import { cookies } from "next/headers";
import { route, json } from "@/lib/server/http";
import { endTesterSession } from "@/lib/server/tester-auth";
import { PREVIEW_COOKIE } from "@/lib/server/viewer";

export const POST = route(async () => {
  await endTesterSession();
  (await cookies()).set(PREVIEW_COOKIE, "", { path: "/", maxAge: 0 });
  return json({ ok: true });
});
