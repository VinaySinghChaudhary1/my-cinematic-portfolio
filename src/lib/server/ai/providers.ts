/**
 * Provider adapters — plain fetch, no SDKs, so any current or future model name works.
 *   anthropic  → POST https://api.anthropic.com/v1/messages            (structured output: output_config.format)
 *   gemini     → POST …/v1beta/models/{model}:generateContent           (responseMimeType + responseJsonSchema; images via responseModalities)
 *   openai     → POST https://api.openai.com/v1/responses                (text.format json_schema) · POST /v1/images/generations
 *   compatible → POST {baseUrl}/chat/completions                        (OpenRouter, Ollama, LM Studio, Groq, Together…)
 * Every error is turned into a clear AiError — e.g. "Your OpenAI API key limit is exhausted…".
 */
import type { Resolved } from "./config";
import { KIND_INFO, isOpenRouter } from "./config";

export interface Attachment {
  mime: string; // image/png, image/jpeg, image/webp, application/pdf
  data: Uint8Array;
  name: string;
}
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}
export type AiErrorKind = "not_configured" | "auth" | "quota" | "rate" | "model" | "bad_request" | "blocked" | "unavailable" | "timeout" | "unsupported" | "bad_output";

export class AiError extends Error {
  constructor(
    message: string,
    public kind: AiErrorKind,
    public status = 502,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 120_000;
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const dataUrl = (a: Attachment) => `data:${a.mime};base64,${b64(a.data)}`;
/** Display name: a slot label ("OpenRouter") or a kind ("gemini" → "Gemini"). */
const name = (p: string) => ((KIND_INFO as Record<string, { name: string }>)[p]?.name ?? p).replace(/ \(.*\)$/, "");

/** Turns any provider error into a short, honest message. Never includes the key. */
export function mapProviderError(p: string, status: number, raw: string, model: string, key = ""): AiError {
  let msg = raw;
  try {
    const j = JSON.parse(raw);
    msg = j?.error?.message || j?.error?.status || j?.message || (typeof j?.error === "string" ? j.error : raw);
  } catch {
    /* not JSON */
  }
  msg = String(msg || `HTTP ${status}`).replace(/\s+/g, " ").slice(0, 300);
  if (key) msg = msg.split(key).join("[key]");
  const lower = msg.toLowerCase();
  const n = name(p);
  if (/credit balance|insufficient_quota|exceeded your current quota|quota exceeded|resource_exhausted|billing|payment required|out of credits|insufficient credit|spend limit/.test(lower) || status === 402)
    return new AiError(`Your ${n} API key limit is exhausted — ${msg}. Add credit / upgrade your plan with ${n}, or wait for the limit to reset, or switch to another provider in Admin → AI.`, "quota", 402);
  if (status === 401 || /invalid api key|incorrect api key|api key not valid|invalid x-api-key|unauthorized/.test(lower))
    return new AiError(`${n} rejected the API key. Check it in Admin → AI. (${msg})`, "auth", 400);
  if (status === 403) return new AiError(`${n} refused the request: ${msg}`, "auth", 400);
  if (status === 429) return new AiError(`${n} is rate-limiting this key (too many requests). Wait a minute and try again. (${msg})`, "rate", 429);
  if (status === 404 || /model.*(not found|does not exist|not supported|unknown)|no such model/.test(lower))
    return new AiError(`Model "${model}" isn't available for your ${n} key. Pick another model in Admin → AI. (${msg})`, "model", 400);
  if (status === 408) return new AiError(`${n} timed out. Try again.`, "timeout", 504);
  if (status >= 500) return new AiError(`${n} is busy or temporarily unavailable (${status}: ${msg}). This is on ${n}'s side — try again in a minute, or pick another model (e.g. a "lite" model) in Admin → AI.`, "unavailable", 503);
  return new AiError(`${n}: ${msg}`, "bad_request", 400);
}

async function call(p: string, url: string, init: RequestInit, model: string, key: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    // Busy/overloaded provider (503, 529, 500): wait and retry up to twice before giving up.
    for (let attempt = 1; attempt <= 2 && [500, 502, 503, 529].includes(res.status); attempt++) {
      await new Promise((r) => setTimeout(r, attempt * 2500));
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    }
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new AiError(`${name(p)} took too long to answer. Try again or use a faster model.`, "timeout", 504);
    throw new AiError(`Couldn't reach ${name(p)}. Check the server's internet connection and, for OpenAI-compatible services, the base URL.`, "unavailable", 503);
  }
  const text = await res.text();
  if (!res.ok) throw mapProviderError(p, res.status, text, model, key);
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError(`${name(p)} returned an unreadable response.`, "bad_output");
  }
}

/** Pulls a JSON object out of a model reply (handles ```json fences and stray text). */
export function parseJsonLoose(text: string): Record<string, unknown> {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(t.slice(a, b + 1));
      } catch {
        /* fall through */
      }
    }
  }
  throw new AiError("The AI answer wasn't valid JSON. Try again or use a stronger model.", "bad_output");
}

export interface GenInput {
  system: string;
  prompt: string;
  attachments?: Attachment[];
  maxTokens?: number;
  schema?: Record<string, unknown>; // when set → JSON output
}
export interface GenOutput {
  text: string;
  usage: Usage;
}

// ─────────────────────────── Anthropic ───────────────────────────
async function anthropic(r: Resolved, i: GenInput, structured: boolean): Promise<GenOutput> {
  const content: unknown[] = [];
  for (const a of i.attachments ?? []) {
    if (a.mime === "application/pdf") content.push({ type: "document", source: { type: "base64", media_type: a.mime, data: b64(a.data) } });
    else content.push({ type: "image", source: { type: "base64", media_type: a.mime, data: b64(a.data) } });
  }
  content.push({ type: "text", text: i.prompt });
  const body: Record<string, unknown> = { model: r.textModel, max_tokens: Math.max(i.maxTokens ?? 8192, 1024), system: i.system, messages: [{ role: "user", content }] };
  if (i.schema && structured) body.output_config = { format: { type: "json_schema", schema: i.schema } };
  const j = (await call(r.label, "https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": r.key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) }, r.textModel, r.key)) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  if (j.stop_reason === "refusal") throw new AiError("Claude declined this request.", "blocked", 400);
  return { text: (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join(""), usage: { inputTokens: j.usage?.input_tokens ?? 0, outputTokens: j.usage?.output_tokens ?? 0 } };
}

// ─────────────────────────── Gemini ───────────────────────────
const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string } };
type GeminiResp = { candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string }; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };

function geminiCheck(j: GeminiResp) {
  if (j.promptFeedback?.blockReason) throw new AiError(`Gemini blocked the request (${j.promptFeedback.blockReason}).`, "blocked", 400);
  const fr = j.candidates?.[0]?.finishReason;
  if (fr && /SAFETY|PROHIBITED|BLOCKLIST|IMAGE_SAFETY/.test(fr)) throw new AiError(`Gemini stopped for safety reasons (${fr}). Rephrase and try again.`, "blocked", 400);
}

async function gemini(r: Resolved, i: GenInput, structured: boolean): Promise<GenOutput> {
  const parts: GeminiPart[] = (i.attachments ?? []).map((a) => ({ inlineData: { mimeType: a.mime, data: b64(a.data) } }));
  parts.push({ text: i.prompt });
  // Thinking models spend output tokens on reasoning first — never give them a tiny budget.
  const generationConfig: Record<string, unknown> = { maxOutputTokens: Math.max(i.maxTokens ?? 8192, 2048) };
  if (i.schema && structured) Object.assign(generationConfig, { responseMimeType: "application/json", responseJsonSchema: i.schema });
  const j = (await call(r.label, `${GEMINI}/models/${encodeURIComponent(r.textModel)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": r.key, "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: i.system }] }, contents: [{ role: "user", parts }], generationConfig }) }, r.textModel, r.key)) as GeminiResp;
  geminiCheck(j);
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  if (!text.trim()) {
    const fr = j.candidates?.[0]?.finishReason ?? "none";
    if (fr === "MAX_TOKENS") throw new AiError(`${r.textModel} used its whole output limit while thinking and returned no text. Try again, or pick a "flash"/"lite" model.`, "bad_output");
    throw new AiError(`Gemini (${r.textModel}) returned no text (finish reason: ${fr}). Try again or choose another model.`, "bad_output");
  }
  return { text, usage: { inputTokens: j.usageMetadata?.promptTokenCount ?? 0, outputTokens: j.usageMetadata?.candidatesTokenCount ?? 0 } };
}

// ─────────────────────────── OpenAI (Responses API) ───────────────────────────
async function openai(r: Resolved, i: GenInput, structured: boolean): Promise<GenOutput> {
  const content: unknown[] = [];
  for (const a of i.attachments ?? []) {
    if (a.mime === "application/pdf") content.push({ type: "input_file", filename: a.name || "document.pdf", file_data: dataUrl(a) });
    else content.push({ type: "input_image", image_url: dataUrl(a) });
  }
  content.push({ type: "input_text", text: i.prompt });
  const body: Record<string, unknown> = { model: r.textModel, instructions: i.system, input: [{ role: "user", content }], max_output_tokens: Math.max(i.maxTokens ?? 8192, 2048) };
  if (i.schema && structured) body.text = { format: { type: "json_schema", name: "portfolio_form", schema: i.schema, strict: false } };
  const j = (await call(r.label, "https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${r.key}`, "content-type": "application/json" }, body: JSON.stringify(body) }, r.textModel, r.key)) as {
    output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
    usage?: { input_tokens?: number; output_tokens?: number };
    status?: string;
    incomplete_details?: { reason?: string };
  };
  const anyText = (j.output ?? []).some((o) => o.type === "message" && (o.content ?? []).some((c) => c.type === "output_text" && c.text));
  if (!anyText && j.status === "incomplete" && j.incomplete_details?.reason === "max_output_tokens")
    throw new AiError(`${r.textModel} used its whole output limit while reasoning and returned no text. Try again or pick a smaller model.`, "bad_output");
  const parts = (j.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  const refusal = parts.find((c) => c.type === "refusal");
  if (refusal && !parts.some((c) => c.type === "output_text")) throw new AiError(`OpenAI declined: ${refusal.refusal ?? ""}`, "blocked", 400);
  return { text: parts.filter((c) => c.type === "output_text").map((c) => c.text).join(""), usage: { inputTokens: j.usage?.input_tokens ?? 0, outputTokens: j.usage?.output_tokens ?? 0 } };
}

// ─────────────────────────── OpenAI-compatible (chat completions) ───────────────────────────
export function compatibleBase(baseUrl: string): string {
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new AiError("The base URL for the OpenAI-compatible provider is not valid.", "not_configured", 400);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) throw new AiError("The base URL must use https:// (http:// is allowed only for localhost).", "not_configured", 400);
  return u.toString().replace(/\/+$/, "");
}

async function compatible(r: Resolved, i: GenInput, structured: boolean): Promise<GenOutput> {
  const atts = i.attachments ?? [];
  const router = isOpenRouter(r.baseUrl);
  const hasPdf = atts.some((a) => a.mime === "application/pdf");
  if (hasPdf && !router) throw new AiError(`${r.label} can't read PDFs here. Use Claude, Gemini, OpenAI or OpenRouter, or paste the text instead.`, "unsupported", 400);
  const parts: unknown[] = [{ type: "text", text: i.prompt }];
  for (const a of atts) {
    // OpenRouter reads PDFs as a "file" part; the free cloudflare-ai parser turns it into text for any model.
    if (a.mime === "application/pdf") parts.push({ type: "file", file: { filename: a.name || "document.pdf", file_data: dataUrl(a) } });
    else parts.push({ type: "image_url", image_url: { url: dataUrl(a) } });
  }
  const body: Record<string, unknown> = { model: r.textModel, max_tokens: Math.max(i.maxTokens ?? 8192, 1024), messages: [{ role: "system", content: i.system }, { role: "user", content: atts.length ? parts : i.prompt }] };
  if (i.schema && structured) body.response_format = { type: "json_schema", json_schema: { name: "portfolio_form", schema: i.schema } };
  if (router && hasPdf) body.plugins = [{ id: "file-parser", pdf: { engine: "cloudflare-ai" } }];
  const j = (await call(r.label, `${compatibleBase(r.baseUrl)}/chat/completions`, { method: "POST", headers: bearer(r.key), body: JSON.stringify(body) }, r.textModel, r.key)) as {
    choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string; code?: number };
  };
  // OpenRouter can answer 200 with an error object (e.g. the upstream model failed)
  if (j.error?.message) throw mapProviderError(r.label, Number(j.error.code) || 502, JSON.stringify({ error: j.error }), r.textModel, r.key);
  const c = j.choices?.[0];
  const text = c?.message?.content ?? "";
  if (!text.trim() && c?.message?.refusal) throw new AiError(`${r.label} declined: ${c.message.refusal}`, "blocked", 400);
  if (!text.trim() && c?.finish_reason === "length") throw new AiError(`${r.textModel} used its whole output limit and returned no text. Try again or pick another model.`, "bad_output");
  return { text, usage: { inputTokens: j.usage?.prompt_tokens ?? 0, outputTokens: j.usage?.completion_tokens ?? 0 } };
}

function bearer(key: string): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (key) h.authorization = `Bearer ${key}`;
  return h;
}

const TEXT = { anthropic, gemini, openai, compatible };

/** Plain text (or Markdown) answer. */
export async function generateText(r: Resolved, i: GenInput): Promise<GenOutput> {
  if (!r.textModel) throw new AiError(`Choose a writing model for ${r.label} in Admin → AI.`, "not_configured", 400);
  const out = await TEXT[r.kind](r, { ...i, schema: undefined }, false);
  if (!out.text.trim()) throw new AiError(`${r.label} returned an empty answer. Try again.`, "bad_output");
  return out;
}

/**
 * JSON answer that follows `schema`. Uses the provider's structured-output mode; if the model doesn't support it,
 * retries once in plain mode with the schema in the prompt. The caller validates the result again.
 */
export async function generateJson(r: Resolved, i: GenInput & { schema: Record<string, unknown> }): Promise<{ data: Record<string, unknown>; usage: Usage }> {
  if (!r.textModel) throw new AiError(`Choose a writing model for ${r.label} in Admin → AI.`, "not_configured", 400);
  try {
    const out = await TEXT[r.kind](r, i, true);
    return { data: parseJsonLoose(out.text), usage: out.usage };
  } catch (e) {
    const retry = e instanceof AiError && (e.kind === "bad_request" || e.kind === "bad_output") && /schema|output_config|response_format|json|format|structured|responsejsonschema|bad_output/i.test(e.message + e.kind);
    if (!retry) throw e;
    const out = await TEXT[r.kind](r, { ...i, prompt: `${i.prompt}\n\nReturn ONLY one JSON object (no prose, no code fences) that matches this JSON Schema:\n${JSON.stringify(i.schema)}` }, false);
    return { data: parseJsonLoose(out.text), usage: out.usage };
  }
}

// ─────────────────────────── images ───────────────────────────
export type Aspect = "1:1" | "16:9" | "4:5" | "3:2" | "2:3";
const OPENAI_SIZE: Record<Aspect, string> = { "1:1": "1024x1024", "16:9": "1536x1024", "3:2": "1536x1024", "4:5": "1024x1536", "2:3": "1024x1536" };

type ImagesResp = { data?: { b64_json?: string; url?: string }[]; usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };

async function imageBytes(j: ImagesResp, label: string): Promise<{ bytes: Uint8Array; usage: Usage }> {
  const d = j.data?.[0];
  let bytes: Uint8Array | null = d?.b64_json ? new Uint8Array(Buffer.from(d.b64_json.replace(/^data:[^,]+,/, ""), "base64")) : null;
  if (!bytes && d?.url?.startsWith("data:")) bytes = new Uint8Array(Buffer.from(d.url.replace(/^data:[^,]+,/, ""), "base64"));
  if (!bytes && d?.url?.startsWith("https://")) {
    const res = await fetch(d.url, { signal: AbortSignal.timeout(60_000) });
    if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
  }
  if (!bytes) throw new AiError(`${label}'s image model didn't return an image.`, "bad_output");
  return { bytes, usage: { inputTokens: j.usage?.input_tokens ?? j.usage?.prompt_tokens ?? 0, outputTokens: j.usage?.output_tokens ?? j.usage?.completion_tokens ?? 0 } };
}

export async function generateImage(r: Resolved, prompt: string, aspect: Aspect): Promise<{ bytes: Uint8Array; usage: Usage }> {
  if (r.kind === "anthropic") throw new AiError("Claude can't create photos or raster images — choose Gemini, OpenAI or an image-capable service for images, or use the SVG option.", "unsupported", 400);
  if (!r.imageModel) throw new AiError(`${r.label} has no image model set. Add one in Admin → AI.`, "not_configured", 400);
  if (r.kind === "gemini") {
    const j = (await call(r.label, `${GEMINI}/models/${encodeURIComponent(r.imageModel)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": r.key, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } } }),
    }, r.imageModel, r.key)) as GeminiResp;
    geminiCheck(j);
    const part = (j.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data || p.inline_data?.data);
    const data = part?.inlineData?.data ?? part?.inline_data?.data;
    if (!data) throw new AiError("Gemini didn't return an image. Try a different description or image model.", "bad_output");
    return { bytes: new Uint8Array(Buffer.from(data, "base64")), usage: { inputTokens: j.usageMetadata?.promptTokenCount ?? 0, outputTokens: j.usageMetadata?.candidatesTokenCount ?? 0 } };
  }
  if (r.kind === "openai") {
    const j = (await call(r.label, "https://api.openai.com/v1/images/generations", { method: "POST", headers: bearer(r.key), body: JSON.stringify({ model: r.imageModel, prompt, size: OPENAI_SIZE[aspect], n: 1 }) }, r.imageModel, r.key)) as ImagesResp;
    return imageBytes(j, r.label);
  }
  // OpenAI-compatible. OpenRouter: POST /images with aspect_ratio. Others: the OpenAI-style /images/generations,
  // and if the service doesn't have that path, its /images endpoint.
  const base = compatibleBase(r.baseUrl);
  const viaImages = () => call(r.label, `${base}/images`, { method: "POST", headers: bearer(r.key), body: JSON.stringify({ model: r.imageModel, prompt, aspect_ratio: aspect, n: 1 }) }, r.imageModel, r.key);
  if (isOpenRouter(r.baseUrl)) return imageBytes((await viaImages()) as ImagesResp, r.label);
  try {
    return imageBytes((await call(r.label, `${base}/images/generations`, { method: "POST", headers: bearer(r.key), body: JSON.stringify({ model: r.imageModel, prompt, size: OPENAI_SIZE[aspect], n: 1 }) }, r.imageModel, r.key)) as ImagesResp, r.label);
  } catch (e) {
    if (e instanceof AiError && e.kind === "model" && /not found|404/i.test(e.message)) return imageBytes((await viaImages()) as ImagesResp, r.label);
    throw e;
  }
}

// ─────────────────────────── models list ───────────────────────────
export async function listModels(r: Resolved): Promise<string[]> {
  if (r.kind === "anthropic") {
    const j = (await call(r.label, "https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": r.key, "anthropic-version": "2023-06-01" } }, "", r.key)) as { data?: { id: string }[] };
    return (j.data ?? []).map((m) => m.id);
  }
  if (r.kind === "gemini") {
    const j = (await call(r.label, `${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": r.key } }, "", r.key)) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (j.models ?? []).filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
  }
  const base = r.kind === "openai" ? "https://api.openai.com/v1" : compatibleBase(r.baseUrl);
  const headers: Record<string, string> = r.key ? { authorization: `Bearer ${r.key}` } : {};
  const j = (await call(r.label, `${base}/models`, { headers }, "", r.key)) as { data?: { id: string }[] };
  const ids = (j.data ?? []).map((m) => m.id);
  // OpenRouter lists image models separately
  if (isOpenRouter(r.baseUrl)) {
    try {
      const im = (await call(r.label, `${base}/models?output_modalities=image`, { headers }, "", r.key)) as { data?: { id: string }[] };
      for (const m of im.data ?? []) if (!ids.includes(m.id)) ids.push(m.id);
    } catch {
      /* optional */
    }
  }
  return ids.sort();
}
