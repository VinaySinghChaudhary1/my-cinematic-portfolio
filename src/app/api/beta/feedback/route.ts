import { z } from "zod";
import { after } from "next/server";
import { db, schema } from "@/db";
import { route, json, readJson } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { getCurrentTester } from "@/lib/server/tester-auth";
import { getCurrentUser } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/errors";
import { newId } from "@/lib/server/ids";
import { notifyFeedback } from "@/lib/server/notify";

const body = z.object({ message: z.string().trim().min(3, "Write a little more").max(4000), page: z.string().max(300).default("") });

/** Beta testers' feedback lands in the admin inbox (subject “[Beta feedback] …”) and is emailed to the owner. */
export const POST = route(async (req) => {
  const t = await getCurrentTester();
  if (!t) {
    if (await getCurrentUser()) throw new HttpError(400, "You're the owner — feedback is for beta testers.", "owner");
    throw new HttpError(401, "Your beta access has ended. Sign in again.", "unauthorized");
  }
  await rateLimit(`feedback:${t.id}`, 20, 60 * 60_000);
  const v = body.parse(await readJson(req, 10_000));
  const page = v.page.replace(/[^\w\-/#?=&.%]/g, "").slice(0, 200);
  await db.insert(schema.messages).values({
    id: newId(),
    name: `${t.name} (beta tester)`,
    email: t.email || `${t.username}@beta-tester.local`,
    subject: `[Beta feedback] ${page || "/"}`.slice(0, 150),
    body: v.message,
    createdAt: Date.now(),
  });
  after(() => notifyFeedback({ tester: t.name, page, body: v.message }).catch((e) => console.error("[notify] feedback", e)));
  return json({ ok: true }, { status: 201 });
});
