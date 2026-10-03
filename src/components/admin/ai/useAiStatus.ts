"use client";
import { useEffect, useState } from "react";

export interface AiOption {
  id: string;
  label: string;
  textModel: string;
  imageModel: string;
  canPdf: boolean;
  canImage: boolean;
  hasImageModel: boolean;
}
export interface AiStatus {
  ready: boolean;
  provider: string;
  model: string;
  images: "raster" | "svg" | "none";
  fallback: boolean;
  textOrder: string[];
  imageOrder: string[];
  options: AiOption[];
}

const NONE: AiStatus = { ready: false, provider: "", model: "", images: "none", fallback: false, textOrder: [], imageOrder: [], options: [] };
let cache: { at: number; p: Promise<AiStatus> } | null = null;

/** Shared, cached (30 s) check of whether AI is set up — used by every ✨ button. */
export function loadAiStatus(force = false): Promise<AiStatus> {
  if (!force && cache && Date.now() - cache.at < 30_000) return cache.p;
  const p = fetch("/api/admin/ai/status", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : NONE))
    .then((j) => ({ ...NONE, ...j, ready: !!j.ready }) as AiStatus)
    .catch(() => NONE);
  cache = { at: Date.now(), p };
  return p;
}

export function useAiStatus(): AiStatus | null {
  const [s, setS] = useState<AiStatus | null>(null);
  useEffect(() => {
    let alive = true;
    loadAiStatus().then((v) => alive && setS(v));
    return () => {
      alive = false;
    };
  }, []);
  return s;
}

export interface AiTarget {
  target: "item" | "config" | "settings";
  sectionType?: string;
  sectionTitle?: string;
  settingsGroup?: string;
  /** Other entries of the section — used as style examples. */
  examples?: Record<string, unknown>[];
}

/** The provider chosen in a dialog is remembered for this browser tab (text and images separately). */
const remembered: Record<"text" | "image", string> = { text: "auto", image: "auto" };
export function usePick(kind: "text" | "image", status: AiStatus | null): [string, (v: string) => void] {
  const [v, setV] = useState(remembered[kind]);
  const valid = v === "auto" || (kind === "image" && v === "svg") || !!status?.options.some((o) => o.id === v);
  return [
    valid ? v : "auto",
    (n: string) => {
      remembered[kind] = n;
      setV(n);
    },
  ];
}

export interface Failed {
  provider: string;
  model: string;
  error: string;
}

/** One line for the toast when the first choice failed and another provider did the job. */
export function fallbackNote(failed: Failed[] | undefined, usedProvider: string): string {
  if (!failed?.length) return "";
  const first = failed[0].error.replace(/\s+/g, " ");
  return `${failed.map((f) => f.provider).join(", ")} didn't work (${first.slice(0, 140)}${first.length > 140 ? "…" : ""}) — ${usedProvider} did it instead.`;
}
