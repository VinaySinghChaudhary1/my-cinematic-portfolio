import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./errors";
import { ensureSchema } from "@/db";

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;

/** Client IP (best effort, behind Vercel / proxies). Only used for rate-limiting & audit. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (req.headers.get("x-real-ip") ?? "local").slice(0, 64);
}

/**
 * CSRF defence for cookie-authenticated mutations: the Origin (or Referer) host must match the Host.
 * Combined with SameSite=Lax cookies this blocks cross-site form/fetch attacks.
 */
export function assertSameOrigin(req: Request) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !origin) throw new HttpError(403, "Request blocked (missing origin).", "csrf");
  try {
    if (new URL(origin).host !== host) throw new Error();
  } catch {
    throw new HttpError(403, "Request blocked (cross-site).", "csrf");
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

/**
 * Wraps every API route: ensures DB schema, CSRF check, consistent JSON errors,
 * and never leaks stack traces / DB errors to the client (a correlation id is returned instead).
 */
export function route<P = Record<string, string>>(fn: Handler<P>, opts: { csrf?: boolean } = { csrf: true }): Handler<P> {
  return async (req, ctx) => {
    try {
      await ensureSchema();
      if (opts.csrf !== false) assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ ok: false, error: err.message, code: err.code, fields: err.fields }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) {
          const k = issue.path.join(".") || "_";
          if (!fields[k]) fields[k] = issue.message;
        }
        return json({ ok: false, error: "Please fix the highlighted fields.", code: "validation", fields }, { status: 400 });
      }
      if (err instanceof SyntaxError) {
        return json({ ok: false, error: "Malformed request body.", code: "bad_json" }, { status: 400 });
      }
      const ref = crypto.randomUUID().slice(0, 8);
      console.error(`[api ${ref}] ${req.method} ${req.nextUrl.pathname}`, err);
      return json(
        { ok: false, error: `Something went wrong on our side. Reference: ${ref}`, code: "server_error", ref },
        { status: 500 },
      );
    }
  };
}

export async function readJson(req: Request, maxBytes = 1_000_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new HttpError(413, "Request is too large.", "too_large");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request is too large.", "too_large");
  return JSON.parse(text || "{}");
}
