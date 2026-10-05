import { after } from "next/server";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { contactSchema } from "@/lib/validation";
import { getAllSections } from "@/lib/server/content";
import { HttpError } from "@/lib/server/errors";
import { newId } from "@/lib/server/ids";
import { notifyNewMessage } from "@/lib/server/notify";

export const POST = route(async (req) => {
  const contact = (await getAllSections()).find((s) => s.type === "contact");
  if (!contact?.enabled || contact.config.showForm === false) {
    throw new HttpError(403, "The contact form is currently closed.", "closed");
  }
  const v = contactSchema.parse(await readJson(req, 20_000));
  // Bots: honeypot filled, or submitted faster than a human could type → pretend success, store nothing.
  if (v.website || (v.startedAt && Date.now() - v.startedAt < 2500)) return json({ ok: true });
  await rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60_000);
  await db.insert(schema.messages).values({
    id: newId(),
    name: v.name,
    email: v.email,
    subject: v.subject ?? "",
    body: v.message,
    createdAt: Date.now(),
  });
  // Email alert after the response is sent — a slow or failing email service never affects the visitor.
  after(() => notifyNewMessage({ name: v.name, email: v.email, subject: v.subject ?? "", body: v.message }).catch((e) => console.error("[notify] message alert failed", e)));
  return json({ ok: true }, { status: 201 });
});
