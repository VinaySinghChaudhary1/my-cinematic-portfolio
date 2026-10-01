import fs from "node:fs/promises";
import { resolveLocal, EXT_TO_MIME } from "@/lib/server/storage";

/** Serves locally-stored uploads with safe headers. (On Vercel, uploads are served by Vercel Blob instead.) */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  const full = resolveLocal(key);
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const mime = EXT_TO_MIME[ext];
  if (!full || !mime) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        // images are sandboxed completely; PDFs need the browser's viewer, so only scripts/plugins from the file are blocked
        "Content-Security-Policy":
          mime === "application/pdf" ? "default-src 'none'; frame-ancestors 'self'" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        ...(mime === "application/pdf" ? { "Content-Disposition": "inline" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
