import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, readJson, clientIp } from "@/lib/server/http";
import { requireAdmin, audit, hashPassword } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { HttpError } from "@/lib/server/errors";
import { newId } from "@/lib/server/ids";
import { emailInvite, generatePassword, inviteText, publicTester, uniqueUsername, whatsappUrl } from "@/lib/server/testers";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.select().from(schema.testers).orderBy(desc(schema.testers.createdAt));
  return json({ ok: true, testers: rows.map(publicTester) });
});

export const testerFields = {
  name: z.string().trim().min(2, "Enter a name").max(80),
  email: z.union([z.literal(""), z.email("Enter a valid email").max(200)]).default(""),
  phone: z.string().trim().max(24).regex(/^[+\d\s()-]*$/, "Digits only, with country code").default(""),
  expiresAt: z.number().int().positive().nullable().default(null),
  canSeeDrafts: z.boolean().default(true),
  note: z.string().trim().max(300).default(""),
};
const create = z.object({ ...testerFields, username: z.string().trim().max(30).regex(/^[a-zA-Z0-9._-]*$/, "Letters, numbers, dot, dash").default(""), sendEmail: z.boolean().default(true) });

/** Creates a tester. The password is returned ONCE (only its hash is stored). */
export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`testers:${user.id}`, 60, 60 * 60_000);
  const v = create.parse(await readJson(req, 10_000));
  if (v.expiresAt && v.expiresAt < Date.now()) throw new HttpError(400, "The expiry date is in the past.", "validation", { expiresAt: "Pick a future date" });
  const username = await uniqueUsername(v.username || v.name);
  const password = generatePassword();
  const row = {
    id: newId(),
    name: v.name,
    username,
    email: v.email.toLowerCase(),
    phone: v.phone,
    passwordHash: await hashPassword(password),
    canSeeDrafts: v.canSeeDrafts,
    note: v.note,
    expiresAt: v.expiresAt,
    createdAt: Date.now(),
  };
  await db.insert(schema.testers).values(row);
  const [t] = await db.select().from(schema.testers).where(eq(schema.testers.id, row.id)).limit(1);
  const text = await inviteText(t, password);
  const mail = v.sendEmail && t.email ? await emailInvite(t, password) : null;
  await audit(user.id, "tester_created", `${username}${mail?.ok ? " (emailed)" : ""}`, clientIp(req));
  return json({ ok: true, tester: publicTester(t), password, invite: { text, whatsapp: t.phone ? whatsappUrl(t.phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`, email: mail } }, { status: 201 });
});
