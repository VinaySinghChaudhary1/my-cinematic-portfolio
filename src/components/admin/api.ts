"use client";
import { toast } from "sonner";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** fetch wrapper for admin calls: JSON, consistent errors, session-expiry redirect with a safe return path. */
export async function api<T = { ok: true }>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(navigator.onLine ? "Network error — please try again." : "You're offline. Reconnect and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    toast.error("Your session expired. Please sign in again.");
    window.location.assign(`/admin/login?reason=expired&next=${next}`);
    throw new ApiError("Session expired", 401);
  }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields);
  return data as T;
}

/** Downscale & re-encode large photos in the browser before upload (faster, and fits serverless body limits). */
export async function compressImage(file: File, maxSide = 2400, quality = 0.86): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  alt: string;
  folder: string;
  createdAt: number;
}

export async function uploadFile(file: File, folder = "general"): Promise<MediaItem> {
  const f = await compressImage(file);
  const fd = new FormData();
  fd.append("file", f);
  fd.append("folder", folder);
  const res = await api<{ media: MediaItem }>("/api/admin/media", { method: "POST", body: fd });
  return res.media;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
