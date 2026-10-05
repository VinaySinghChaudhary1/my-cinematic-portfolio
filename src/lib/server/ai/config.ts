/**
 * AI settings: which providers are set up, which models they use, and in which order they are tried.
 * Stored in the settings table under "ai_config" (never in backups).
 *
 * v1.4.2: providers are "slots". Claude, Gemini and OpenAI have one fixed slot each; any number of
 * OpenAI-compatible services (OpenRouter, Groq, Together, Ollama…) can be added, each with its own slot id.
 * Writing and images each have an ordered list; with fallback on, the next provider is tried when one fails.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema, ensureSchema } from "@/db";
import { decryptKey, encryptKey, last4 } from "./keys";

export const KINDS = ["anthropic", "gemini", "openai", "compatible"] as const;
export type ProviderKind = (typeof KINDS)[number];
/** Slot id: "anthropic" | "gemini" | "openai" | "compatible" (the first compatible slot, kept for old installs) | "c-xxxxxx". */
export type ProviderId = string;
/** @deprecated kept for older imports — the built-in slot ids. */
export const PROVIDERS = KINDS;

export const KIND_INFO: Record<ProviderKind, { name: string; keyUrl: string; text: string; image: string; canImage: boolean; canPdf: boolean }> = {
  anthropic: { name: "Claude (Anthropic)", keyUrl: "https://console.anthropic.com/settings/keys", text: "claude-sonnet-5-5", image: "", canImage: false, canPdf: true },
  gemini: { name: "Gemini (Google)", keyUrl: "https://aistudio.google.com/apikey", text: "gemini-3.8-flash", image: "gemini-3.1-flash-image", canImage: true, canPdf: true },
  openai: { name: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", text: "gpt-6.1-sol", image: "gpt-image-2.5-flare", canImage: true, canPdf: true },
  compatible: { name: "OpenAI-compatible", keyUrl: "https://openrouter.ai/keys", text: "", image: "", canImage: true, canPdf: false },
};
/** @deprecated use KIND_INFO */
export const PROVIDER_INFO = KIND_INFO;

/** Ready-made settings for popular OpenAI-compatible services (all editable). */
export const COMPATIBLE_PRESETS = [
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/keys", textModel: "openrouter/free", imageModel: "", note: "Hundreds of models, including free ones. Reads PDFs. Image models are paid." },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", keyUrl: "https://console.groq.com/keys", textModel: "", imageModel: "", note: "Very fast, generous free tier. Text only." },
  { id: "together", label: "Together AI", baseUrl: "https://api.together.xyz/v1", keyUrl: "https://api.together.ai/settings/api-keys", textModel: "", imageModel: "", note: "Open models; some image models." },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", keyUrl: "https://platform.deepseek.com/api_keys", textModel: "deepseek-chat", imageModel: "", note: "Low-cost text models." },
  { id: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1", keyUrl: "https://console.mistral.ai/api-keys", textModel: "", imageModel: "", note: "Free experiment tier." },
  { id: "cerebras", label: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", keyUrl: "https://cloud.cerebras.ai", textModel: "", imageModel: "", note: "Very fast, free tier. Text only." },
  { id: "ollama", label: "Ollama (this computer)", baseUrl: "http://localhost:11434/v1", keyUrl: "https://ollama.com/download", textModel: "", imageModel: "", note: "Free, runs on the same machine as the site. No key needed." },
  { id: "lmstudio", label: "LM Studio (this computer)", baseUrl: "http://localhost:1234/v1", keyUrl: "https://lmstudio.ai", textModel: "", imageModel: "", note: "Free, runs on the same machine as the site. No key needed." },
  { id: "custom", label: "Other service", baseUrl: "", keyUrl: "", textModel: "", imageModel: "", note: "Any service that says “OpenAI-compatible API”." },
] as const;

export const MAX_COMPATIBLE = 8;

export interface ProviderConfig {
  kind: ProviderKind;
  label: string;
  keyEnc: string;
  last4: string;
  textModel: string;
  imageModel: string;
  baseUrl: string;
}
export interface AiConfig {
  providers: Record<ProviderId, ProviderConfig>;
  /** Writing / filling / reading files — tried in this order. */
  textOrder: ProviderId[];
  /** Covers & artwork — tried in this order; "svg" = drawn as vector art by the writing providers. */
  imageOrder: (ProviderId | "svg")[];
  /** Try the next provider when one fails (quota, overloaded, wrong model, can't read PDFs…). */
  fallback: boolean;
  styleNotes: string;
  /** "Ask about me" chat for visitors. */
  chat: ChatConfig;
  /** @deprecated v1.4.0/1 single choice — migrated into textOrder/imageOrder. */
  textProvider?: string;
  imageProvider?: string;
}

export const CHAT_MODES = ["off", "beta", "public"] as const;
export interface ChatConfig {
  /** off · beta (only testers and you) · public (every visitor) */
  mode: (typeof CHAT_MODES)[number];
  greeting: string;
  /** Extra facts or rules you want the assistant to know (e.g. "I'm open to internships from May 2027"). */
  notes: string;
  /** "auto" = the writing order above, or one provider slot (handy to keep the chat on a free model). */
  provider: string;
  /** Questions one visitor (IP) may ask per hour. */
  perVisitorHourly: number;
  /** Questions for the whole site per day — protects your API quota. */
  dailyCap: number;
}
export const DEFAULT_CHAT: ChatConfig = {
  mode: "off",
  greeting: "Hi! Ask me anything about my studies, projects or skills.",
  notes: "",
  provider: "auto",
  perVisitorHourly: 12,
  dailyCap: 200,
};

export function normalizeChat(raw: unknown): ChatConfig {
  const c = (raw && typeof raw === "object" ? raw : {}) as Partial<ChatConfig>;
  const int = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
  return {
    mode: (CHAT_MODES as readonly string[]).includes(String(c.mode)) ? (c.mode as ChatConfig["mode"]) : "off",
    greeting: typeof c.greeting === "string" && c.greeting.trim() ? c.greeting.slice(0, 200) : DEFAULT_CHAT.greeting,
    notes: typeof c.notes === "string" ? c.notes.slice(0, 2000) : "",
    provider: typeof c.provider === "string" && (c.provider === "auto" || isSlotId(c.provider)) ? c.provider : "auto",
    perVisitorHourly: int(c.perVisitorHourly, DEFAULT_CHAT.perVisitorHourly, 1, 100),
    dailyCap: int(c.dailyCap, DEFAULT_CHAT.dailyCap, 1, 5000),
  };
}

const KEY = "ai_config";
const EMPTY: AiConfig = { providers: {}, textOrder: [], imageOrder: [], fallback: true, styleNotes: "", chat: DEFAULT_CHAT };

export const isSlotId = (id: string) => /^(anthropic|gemini|openai|compatible|c-[a-z0-9]{6})$/.test(id);

export function hostOf(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}
export const isOpenRouter = (baseUrl: string) => /(^|\.)openrouter\.ai$/.test(hostOf(baseUrl));

function defaultLabel(kind: ProviderKind, baseUrl: string) {
  if (kind !== "compatible") return KIND_INFO[kind].name.replace(/ \(.*\)$/, "");
  const host = hostOf(baseUrl);
  const preset = COMPATIBLE_PRESETS.find((p) => p.baseUrl && hostOf(p.baseUrl) === host && (host !== "localhost" || p.baseUrl === baseUrl.replace(/\/+$/, "")));
  return preset?.label.replace(/ \(this computer\)$/, "") ?? (host || "OpenAI-compatible");
}

/** Brings any stored config (v1.4.0 → today) into the current shape. Pure — used on every read. */
export function normalizeConfig(raw: Partial<AiConfig> & Record<string, unknown>): AiConfig {
  const cfg: AiConfig = { ...EMPTY, ...raw, providers: {} } as AiConfig;
  for (const [id, c] of Object.entries((raw.providers ?? {}) as Record<string, Partial<ProviderConfig>>)) {
    if (!c || !isSlotId(id)) continue;
    const kind: ProviderKind = (KINDS as readonly string[]).includes(id) ? (id as ProviderKind) : "compatible";
    cfg.providers[id] = {
      kind,
      label: (c.label || defaultLabel(kind, c.baseUrl ?? "")).slice(0, 40),
      keyEnc: c.keyEnc ?? "",
      last4: c.last4 ?? "",
      textModel: c.textModel ?? "",
      imageModel: c.imageModel ?? "",
      baseUrl: c.baseUrl ?? "",
    };
  }
  const ids = Object.keys(cfg.providers);
  // v1.4.0/1 → v1.4.2: the chosen provider goes first, every other one after it (so fallback works right away)
  if (!Array.isArray(raw.textOrder)) cfg.textOrder = [...(raw.textProvider ? [String(raw.textProvider)] : []), ...ids];
  if (!Array.isArray(raw.imageOrder)) {
    const first = raw.imageProvider ? [String(raw.imageProvider)] : [];
    cfg.imageOrder = first[0] === "svg" ? ["svg"] : [...first, ...ids.filter((id) => KIND_INFO[cfg.providers[id].kind].canImage), ...(ids.length ? ["svg"] : [])];
  }
  cfg.textOrder = [...new Set(cfg.textOrder.filter((id) => ids.includes(id)))];
  cfg.imageOrder = [...new Set(cfg.imageOrder.filter((id) => id === "svg" || (ids.includes(id) && KIND_INFO[cfg.providers[id].kind].canImage)))];
  cfg.fallback = raw.fallback === undefined ? true : !!raw.fallback;
  cfg.chat = normalizeChat(raw.chat);
  delete (cfg as unknown as Record<string, unknown>).publicChat;
  delete cfg.textProvider;
  delete cfg.imageProvider;
  return cfg;
}

export async function getAiConfig(): Promise<AiConfig> {
  await ensureSchema();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY)).limit(1);
  try {
    return normalizeConfig(row ? JSON.parse(row.value) : {});
  } catch {
    return normalizeConfig({});
  }
}

export async function saveAiConfig(cfg: AiConfig) {
  const value = JSON.stringify(normalizeConfig(cfg as AiConfig & Record<string, unknown>));
  await db.insert(schema.settings).values({ key: KEY, value, updatedAt: Date.now() }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: Date.now() } });
}

export function capabilities(c: Pick<ProviderConfig, "kind" | "baseUrl" | "imageModel">) {
  return {
    canPdf: c.kind === "compatible" ? isOpenRouter(c.baseUrl) : KIND_INFO[c.kind].canPdf,
    canImage: KIND_INFO[c.kind].canImage,
    hasImageModel: KIND_INFO[c.kind].canImage && !!c.imageModel,
  };
}

const isConfigured = (c: ProviderConfig) => !!c.keyEnc || (c.kind === "compatible" && !!c.baseUrl);

/** What the browser may see: never the key, only its last 4 characters. */
export function publicAiConfig(cfg: AiConfig) {
  const slots = Object.entries(cfg.providers).map(([id, c]) => ({
    id,
    kind: c.kind,
    label: c.label,
    configured: isConfigured(c),
    keyOk: !c.keyEnc || decryptKey(c.keyEnc) !== null,
    last4: c.last4,
    textModel: c.textModel,
    imageModel: c.imageModel,
    baseUrl: c.baseUrl,
    ...capabilities(c),
  }));
  return { slots, textOrder: cfg.textOrder, imageOrder: cfg.imageOrder, fallback: cfg.fallback, styleNotes: cfg.styleNotes, chat: cfg.chat, info: KIND_INFO, presets: COMPATIBLE_PRESETS };
}

export function newCompatibleId(cfg: AiConfig): ProviderId {
  if (Object.values(cfg.providers).filter((c) => c.kind === "compatible").length >= MAX_COMPATIBLE) throw new Error(`You can add up to ${MAX_COMPATIBLE} OpenAI-compatible services.`);
  for (;;) {
    const id = `c-${randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(6, "0").slice(0, 6)}`;
    if (!cfg.providers[id]) return id;
  }
}

export interface ProviderPatch {
  key?: string;
  label?: string;
  textModel?: string;
  imageModel?: string;
  baseUrl?: string;
  remove?: boolean;
}

export function setProviderKey(cfg: AiConfig, id: ProviderId, patch: ProviderPatch): AiConfig {
  const next: AiConfig = { ...cfg, providers: { ...cfg.providers }, textOrder: [...cfg.textOrder], imageOrder: [...cfg.imageOrder] };
  if (patch.remove) {
    delete next.providers[id];
    next.textOrder = next.textOrder.filter((x) => x !== id);
    next.imageOrder = next.imageOrder.filter((x) => x !== id);
    return next;
  }
  const kind: ProviderKind = (KINDS as readonly string[]).includes(id) ? (id as ProviderKind) : "compatible";
  const isNew = !next.providers[id];
  const cur: ProviderConfig = next.providers[id] ?? { kind, label: "", keyEnc: "", last4: "", textModel: KIND_INFO[kind].text, imageModel: KIND_INFO[kind].image, baseUrl: "" };
  const key = patch.key?.trim();
  const baseUrl = patch.baseUrl?.trim() ?? cur.baseUrl;
  next.providers[id] = {
    ...cur,
    kind,
    ...(key ? { keyEnc: encryptKey(key), last4: last4(key) } : {}),
    label: (patch.label?.trim() || cur.label || defaultLabel(kind, baseUrl)).slice(0, 40),
    textModel: patch.textModel?.trim() ?? cur.textModel,
    imageModel: patch.imageModel?.trim() ?? cur.imageModel,
    baseUrl,
  };
  // a newly added provider joins the end of the queues (the first one becomes the default)
  if (isNew) {
    if (!next.textOrder.includes(id)) next.textOrder.push(id);
    if (KIND_INFO[kind].canImage && !next.imageOrder.includes(id)) {
      const svgAt = next.imageOrder.indexOf("svg");
      if (svgAt >= 0) next.imageOrder.splice(svgAt, 0, id);
      else next.imageOrder.push(id);
    }
    if (!next.imageOrder.includes("svg")) next.imageOrder.push("svg");
  }
  return next;
}

export interface Resolved {
  id: ProviderId;
  kind: ProviderKind;
  label: string;
  key: string;
  textModel: string;
  imageModel: string;
  baseUrl: string;
}

export function resolveProvider(cfg: AiConfig, id: ProviderId | "" | undefined): Resolved | null {
  if (!id) return null;
  const c = cfg.providers[id];
  if (!c) return null;
  const key = decryptKey(c.keyEnc) ?? "";
  if (!key && c.kind !== "compatible") return null;
  if (c.kind === "compatible" && !c.baseUrl) return null;
  return { id, kind: c.kind, label: c.label, key, textModel: c.textModel, imageModel: c.imageModel, baseUrl: c.baseUrl };
}
