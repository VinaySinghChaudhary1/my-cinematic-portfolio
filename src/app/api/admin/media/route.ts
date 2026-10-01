import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { route, json, clientIp } from "@/lib/server/http";
import { requireAdmin, audit } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { HttpError } from "@/lib/server/errors";
import { detectType, storeFile, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "@/lib/server/storage";
import { newId } from "@/lib/server/ids";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.select().from(schema.media).orderBy(desc(schema.media.createdAt));
  return json({ ok: true, media: rows });
});

export const POST = route(async (req) => {
  const user = await requireAdmin();
  await rateLimit(`upload:${user.id}`, 120, 60 * 60_000);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Upload could not be read. The file may be too large.", "bad_upload");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file was attached.", "no_file");
  const folder = String(form.get("folder") ?? "general");
  const alt = String(form.get("alt") ?? "").slice(0, 300);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectType(bytes);
  if (!type) throw new HttpError(415, "Only JPG, PNG, WEBP, GIF, AVIF images or PDF files are allowed.", "bad_type");
  const limit = type.mime === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (bytes.byteLength > limit) throw new HttpError(413, `File is too large (max ${Math.round(limit / 1048576)} MB).`, "too_large");

  const stored = await storeFile(bytes, type.ext, type.mime, folder);
  const row = {
    id: newId(),
    url: stored.url,
    storageKey: stored.storageKey,
    filename: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || `upload.${type.ext}`,
    mime: type.mime,
    size: bytes.byteLength,
    alt,
    folder,
    createdAt: Date.now(),
  };
  await db.insert(schema.media).values(row);
  await audit(user.id, "media_uploaded", row.filename, clientIp(req));
  return json({ ok: true, media: row }, { status: 201 });
});
