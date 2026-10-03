import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pf-ai-test-"));
process.env.DATA_DIR = TMP;
process.env.DATABASE_URL = `file:${path.join(TMP, "ai.db")}`;
process.env.STORAGE_DRIVER = "local";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";

import type { FieldDef } from "@/lib/registry";

// Load app modules only AFTER the env above is set (static imports are hoisted and would open the real database).
let encryptKey: typeof import("@/lib/server/ai/keys").encryptKey, decryptKey: typeof import("@/lib/server/ai/keys").decryptKey;
let jsonSchemaFor: typeof import("@/lib/server/ai/schema").jsonSchemaFor, cleanAiValues: typeof import("@/lib/server/ai/schema").cleanAiValues;
let sanitizeSvg: typeof import("@/lib/server/ai/svg").sanitizeSvg, svgToWebp: typeof import("@/lib/server/ai/svg").svgToWebp;
let P: typeof import("@/lib/server/ai/providers");
beforeAll(async () => {
  ({ encryptKey, decryptKey } = await import("@/lib/server/ai/keys"));
  ({ jsonSchemaFor, cleanAiValues } = await import("@/lib/server/ai/schema"));
  ({ sanitizeSvg, svgToWebp } = await import("@/lib/server/ai/svg"));
  P = await import("@/lib/server/ai/providers");
});
const mapProviderError = (...a: Parameters<typeof P.mapProviderError>) => P.mapProviderError(...a);
const parseJsonLoose = (t: string) => P.parseJsonLoose(t);
const generateJson = (...a: Parameters<typeof P.generateJson>) => P.generateJson(...a);
const generateImage = (...a: Parameters<typeof P.generateImage>) => P.generateImage(...a);

afterAll(() => {
  vi.unstubAllGlobals();
  fs.rmSync(TMP, { recursive: true, force: true });
});

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true, maxLength: 20 },
  { name: "status", label: "Status", type: "select", options: [{ value: "completed", label: "Completed" }, { value: "ongoing", label: "Ongoing" }] },
  { name: "startDate", label: "Start", type: "date" },
  { name: "repoUrl", label: "Repo", type: "url" },
  { name: "tech", label: "Tech", type: "tags" },
  { name: "cover", label: "Cover", type: "image" },
];

describe("API key encryption", () => {
  it("round-trips and rejects tampering", () => {
    const enc = encryptKey("sk-ant-secret-1234");
    expect(enc).not.toContain("secret");
    expect(decryptKey(enc)).toBe("sk-ant-secret-1234");
    const bad = enc.slice(0, -3) + (enc.endsWith("A") ? "B" : "A") + enc.slice(-2);
    expect(decryptKey(bad)).toBeNull();
  });
});

describe("form schema for the AI", () => {
  it("skips media fields and lists enum options", () => {
    const s = jsonSchemaFor(FIELDS) as { properties: Record<string, { enum?: string[] }> };
    expect(Object.keys(s.properties)).toEqual(["title", "status", "startDate", "repoUrl", "tech"]);
    expect(s.properties.status.enum).toContain("completed");
  });
  it("keeps only values that pass the normal validation", () => {
    const r = cleanAiValues(FIELDS, { title: "A very long project title indeed", status: "finished", startDate: "March 2026", repoUrl: "javascript:alert(1)", tech: ["Python", " ", "SQL"], cover: "x" });
    expect(String(r.values.title).length).toBeLessThanOrEqual(20);
    expect(r.values.tech).toEqual(["Python", "SQL"]);
    expect(r.values).not.toHaveProperty("cover");
    expect(r.rejected.map((x) => x.field).sort()).toEqual(["Repo", "Start", "Status"]);
  });
  it("drops empty answers so they never overwrite your text", () => {
    expect(cleanAiValues(FIELDS, { title: "", tech: [] }).values).toEqual({});
  });
});

describe("SVG safety", () => {
  it("removes scripts, handlers, external links and foreignObject", () => {
    const dirty = `Sure!\n\`\`\`svg\n<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><foreignObject><div>x</div></foreignObject><image href="https://evil/x.png"/><a href="https://evil"><rect width="5" height="5"/></a><defs><linearGradient id="g"><stop offset="0" stop-color="#8b5cf6"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)" style="fill:url(https://evil)"/><use href="#g"/></svg>\n\`\`\``;
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toMatch(/script|onload|foreignObject|evil|<image|<a /i);
    expect(clean).toContain('fill="url(#g)"');
    expect(clean).toContain("linearGradient");
    expect(clean.startsWith("<svg")).toBe(true);
  });
  it("converts the SVG into a WebP bitmap", async () => {
    const webp = await svgToWebp(sanitizeSvg('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#22d3ee"/></svg>'), 64, 64);
    expect(String.fromCharCode(...webp.slice(8, 12))).toBe("WEBP");
  });
});

describe("provider errors are clear", () => {
  it("explains an exhausted key for every provider", () => {
    const a = mapProviderError("anthropic", 400, JSON.stringify({ error: { message: "Your credit balance is too low to access the Anthropic API." } }), "m");
    const o = mapProviderError("openai", 429, JSON.stringify({ error: { message: "You exceeded your current quota, please check your plan and billing details.", code: "insufficient_quota" } }), "m");
    const g = mapProviderError("gemini", 429, JSON.stringify({ error: { message: "Quota exceeded for metric", status: "RESOURCE_EXHAUSTED" } }), "m");
    for (const e of [a, o, g]) {
      expect(e.kind).toBe("quota");
      expect(e.message).toMatch(/API key limit is exhausted/);
    }
  });
  it("separates bad keys, rate limits and unknown models — and never echoes the key", () => {
    expect(mapProviderError("openai", 401, '{"error":{"message":"Incorrect API key provided: sk-abc123"}}', "m", "sk-abc123").message).not.toContain("sk-abc123");
    expect(mapProviderError("openai", 401, "{}", "m").kind).toBe("auth");
    expect(mapProviderError("gemini", 429, '{"error":{"message":"Too many requests"}}', "m").kind).toBe("rate");
    expect(mapProviderError("anthropic", 404, '{"error":{"message":"model: claude-x not found"}}', "claude-x").kind).toBe("model");
  });
  it("parses JSON wrapped in code fences", () => {
    expect(parseJsonLoose('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("adapters (mocked network)", () => {
  const anthropic = { id: "anthropic", kind: "anthropic" as const, label: "Claude", key: "k-1", textModel: "claude-sonnet-5-5", imageModel: "", baseUrl: "" };

  it("Claude: sends the schema as structured output and reads the JSON", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.output_config.format.type).toBe("json_schema");
      expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k-1");
      return new Response(JSON.stringify({ content: [{ type: "text", text: '{"title":"Hi"}' }], usage: { input_tokens: 10, output_tokens: 3 } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await generateJson(anthropic, { system: "s", prompt: "p", schema: { type: "object" } });
    expect(r.data).toEqual({ title: "Hi" });
    expect(r.usage.inputTokens).toBe(10);
  });

  it("falls back to plain JSON when a model rejects structured output", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (++n === 1 ? new Response('{"error":{"message":"output_config.format is not supported for this model"}}', { status: 400 }) : new Response(JSON.stringify({ content: [{ type: "text", text: '{"ok":true}' }] }), { status: 200 }))));
    const r = await generateJson(anthropic, { system: "s", prompt: "p", schema: { type: "object" } });
    expect(r.data).toEqual({ ok: true });
    expect(n).toBe(2);
  });

  it("Gemini: returns generated image bytes", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString("base64");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      expect(url).toContain(":generateContent");
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png } }] } }] }), { status: 200 });
    }));
    const r = await generateImage({ id: "gemini", kind: "gemini", label: "Gemini", key: "g", textModel: "t", imageModel: "gemini-3.1-flash-image", baseUrl: "" }, "a cover", "16:9");
    expect(r.bytes[0]).toBe(0x89);
  });

  it("Claude cannot make raster images — clear message", async () => {
    await expect(generateImage({ ...anthropic, imageModel: "x" }, "p", "1:1")).rejects.toThrow(/can't create photos/);
  });
});

describe("fill a form end to end (mocked OpenAI)", () => {
  beforeAll(async () => {
    const { bootstrap } = await import("@/lib/server/bootstrap");
    await bootstrap();
  });
  it("returns validated suggestions and logs usage — key never leaves the server", async () => {
    const { getAiConfig, saveAiConfig, setProviderKey, publicAiConfig } = await import("@/lib/server/ai/config");
    await saveAiConfig(setProviderKey(await getAiConfig(), "openai", { key: "sk-test-9876", textModel: "gpt-6.1-sol" }));
    expect(JSON.stringify(publicAiConfig(await getAiConfig()))).not.toContain("sk-test-9876");
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.openai.com/v1/responses");
      const body = JSON.parse(String(init.body));
      expect(body.text.format.type).toBe("json_schema");
      return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ institution: "IIT Madras", degree: "Diploma in Data Science", status: "completed", endDate: "2026-09", grade: "", link: "not a url" }) }] }], usage: { input_tokens: 50, output_tokens: 20 } }), { status: 200 });
    }));
    const { fillForm, usageSummary } = await import("@/lib/server/ai/service");
    const r = await fillForm({ target: "item", sectionType: "education", notes: "Diploma in DS from IITM, done Sep 2026", current: {}, attachments: [] });
    expect(r.values).toMatchObject({ institution: "IIT Madras", status: "completed", endDate: "2026-09" });
    expect(r.values).not.toHaveProperty("grade");
    expect(r.rejected.map((x) => x.field)).toContain("Link");
    const u = await usageSummary();
    expect(u.byProvider.openai.requests).toBe(1);
  });
});

describe("v1.4.2 — several providers, order and fallback", () => {
  const router = { id: "c-abc123", kind: "compatible" as const, label: "OpenRouter", key: "or-key", textModel: "openrouter/free", imageModel: "google/gemini-3.1-flash-image", baseUrl: "https://openrouter.ai/api/v1" };
  const groq = { ...router, id: "c-def456", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", imageModel: "" };

  it("migrates a v1.4.0 config: chosen provider first, the others after it", async () => {
    const { normalizeConfig } = await import("@/lib/server/ai/config");
    const c = normalizeConfig({ providers: { gemini: { keyEnc: "x", last4: "1234", textModel: "g", imageModel: "gi", baseUrl: "" }, compatible: { keyEnc: "y", last4: "9", textModel: "openrouter/free", imageModel: "", baseUrl: "https://openrouter.ai/api/v1" } }, textProvider: "gemini", imageProvider: "gemini" } as never);
    expect(c.textOrder).toEqual(["gemini", "compatible"]);
    expect(c.imageOrder).toEqual(["gemini", "compatible", "svg"]);
    expect(c.fallback).toBe(true);
    expect(c.providers.compatible.label).toBe("OpenRouter");
    expect(c.providers.compatible.kind).toBe("compatible");
  });

  it("OpenRouter reads PDFs through the free file parser", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
      const body = JSON.parse(String(init.body));
      const parts = body.messages[1].content;
      expect(parts.some((p: { type: string; file?: { file_data: string } }) => p.type === "file" && p.file!.file_data.startsWith("data:application/pdf;base64,"))).toBe(true);
      expect(body.plugins[0]).toEqual({ id: "file-parser", pdf: { engine: "cloudflare-ai" } });
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"title":"From PDF"}' } }] }), { status: 200 });
    }));
    const r = await generateJson(router, { system: "s", prompt: "p", schema: { type: "object" }, attachments: [{ mime: "application/pdf", data: new Uint8Array([37, 80, 68, 70]), name: "c.pdf" }] });
    expect(r.data).toEqual({ title: "From PDF" });
  });

  it("other compatible services refuse PDFs clearly (so fallback can skip them)", async () => {
    await expect(generateJson(groq, { system: "s", prompt: "p", schema: { type: "object" }, attachments: [{ mime: "application/pdf", data: new Uint8Array([1]), name: "c.pdf" }] })).rejects.toMatchObject({ kind: "unsupported" });
  });

  it("OpenRouter makes images with POST /images and the aspect ratio", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 9]).toString("base64");
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://openrouter.ai/api/v1/images");
      expect(JSON.parse(String(init.body))).toMatchObject({ model: "google/gemini-3.1-flash-image", aspect_ratio: "16:9" });
      return new Response(JSON.stringify({ data: [{ b64_json: png, media_type: "image/png" }] }), { status: 200 });
    }));
    const r = await generateImage(router, "a cover", "16:9");
    expect(r.bytes[0]).toBe(0x89);
  });

  it("reports an error object that OpenRouter sends with status 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "Insufficient credits", code: 402 } }), { status: 200 })));
    await expect(P.generateText(router, { system: "s", prompt: "p" })).rejects.toMatchObject({ kind: "quota" });
  });

  it("falls back to the next provider when the first is out of quota, and logs both", async () => {
    const { getAiConfig, saveAiConfig, setProviderKey } = await import("@/lib/server/ai/config");
    let cfg = await getAiConfig();
    cfg = setProviderKey(cfg, "gemini", { key: "g-key-1111", textModel: "gemini-3.5-flash-lite", imageModel: "gemini-3.1-flash-image" });
    cfg = setProviderKey(cfg, "c-abc123", { key: "or-key-2222", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", textModel: "openrouter/free" });
    cfg.textOrder = ["gemini", "c-abc123"];
    cfg.fallback = true;
    await saveAiConfig(cfg);
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("generativelanguage")) return new Response(JSON.stringify({ error: { message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } }), { status: 429 });
      return new Response(JSON.stringify({ choices: [{ message: { content: "Better text." } }] }), { status: 200 });
    }));
    const { assistText } = await import("@/lib/server/ai/service");
    const r = await assistText({ action: "improve", instruction: "", text: "text", fieldLabel: "Summary", markdown: false, context: {} });
    expect(r.text).toBe("Better text.");
    expect(r.provider).toBe("OpenRouter");
    expect(r.failed[0].provider).toBe("Gemini");
    expect(calls.length).toBe(2);

    // a specific pick uses only that provider — no fallback
    await expect(assistText({ action: "improve", instruction: "", text: "text", fieldLabel: "Summary", markdown: false, context: {}, provider: "gemini" })).rejects.toMatchObject({ kind: "quota" });

    // fallback off → only the first one is tried
    await saveAiConfig({ ...(await getAiConfig()), fallback: false });
    await expect(assistText({ action: "improve", instruction: "", text: "text", fieldLabel: "Summary", markdown: false, context: {} })).rejects.toMatchObject({ kind: "quota" });
    await saveAiConfig({ ...(await getAiConfig()), fallback: true });
  });

  it("PDF fill skips providers that can't read PDFs", async () => {
    const { getAiConfig, saveAiConfig, setProviderKey } = await import("@/lib/server/ai/config");
    let cfg = setProviderKey(await getAiConfig(), "c-def456", { key: "gq-3333", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", textModel: "llama" });
    cfg.textOrder = ["c-def456", "gemini"];
    await saveAiConfig(cfg);
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"institution":"IIT Madras"}' }] } }] }), { status: 200 });
    }));
    const { fillForm } = await import("@/lib/server/ai/service");
    const r = await fillForm({ target: "item", sectionType: "education", notes: "", current: {}, attachments: [{ mime: "application/pdf", data: new Uint8Array([37, 80, 68, 70]), name: "c.pdf" }] });
    expect(r.provider).toBe("Gemini");
    expect(r.failed[0].error).toMatch(/can't read PDFs/);
    expect(calls.every((u) => u.includes("generativelanguage"))).toBe(true);
  });

  it("images: raster providers in order, then SVG as the last resort", async () => {
    const { getAiConfig, saveAiConfig } = await import("@/lib/server/ai/config");
    const cfg = await getAiConfig();
    cfg.imageOrder = ["gemini", "svg"];
    cfg.textOrder = ["gemini"];
    await saveAiConfig(cfg);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("gemini-3.1-flash-image")) return new Response(JSON.stringify({ error: { message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } }), { status: 429 });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '<svg viewBox="0 0 16 9"><rect width="16" height="9" fill="#123"/></svg>' }] } }] }), { status: 200 });
    }));
    const { makeImage } = await import("@/lib/server/ai/service");
    const r = await makeImage({ kind: "cover", description: "neural network", values: { title: "Test" } });
    expect(r.svg).toBe(true);
    expect(r.failed[0].provider).toBe("Gemini");
    expect(r.media.folder).toBe("ai");
  });
});
