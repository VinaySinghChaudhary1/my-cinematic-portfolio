"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileText, Copy, Trash2, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { Spinner, EmptyState, ErrorState, NoResults } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { api, formatBytes, uploadFile, type MediaItem } from "./api";
import { Button, inputCls } from "./ui";

export function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "image" | "pdf">("all");
  const [q, setQ] = useState("");
  const [del, setDel] = useState<MediaItem | null>(null);
  const [drag, setDrag] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setMedia((await api<{ media: MediaItem[] }>("/api/admin/media")).media);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading({ done: 0, total: list.length });
    let ok = 0;
    for (const f of list) {
      try {
        await uploadFile(f, f.type === "application/pdf" ? "documents" : "images");
        ok++;
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
    }
    setUploading(null);
    if (ok) toast.success(`${ok} file${ok > 1 ? "s" : ""} uploaded`);
    load();
  }

  async function saveAlt(m: MediaItem, alt: string) {
    if (alt === m.alt) return;
    try {
      await api(`/api/admin/media/${m.id}`, { method: "PATCH", json: { alt } });
      setMedia((list) => list?.map((x) => (x.id === m.id ? { ...x, alt } : x)) ?? null);
      toast.success("Description saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function remove(m: MediaItem) {
    try {
      await api(`/api/admin/media/${m.id}`, { method: "DELETE" });
      setMedia((list) => list?.filter((x) => x.id !== m.id) ?? null);
      toast.success("File deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDel(null);
    }
  }

  const shown = (media ?? [])
    .filter((m) => filter === "all" || (filter === "pdf" ? m.mime === "application/pdf" : m.mime.startsWith("image/")))
    .filter((m) => !q || `${m.filename} ${m.alt}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition", drag ? "border-accent-2 bg-accent-2/5" : "border-line")}
      >
        <Upload className="size-7 text-accent-2" aria-hidden />
        <p className="text-sm text-ink">Drag & drop photos or PDFs here</p>
        <p className="text-xs text-faint">JPG, PNG, WEBP, GIF, AVIF up to 10 MB · PDF up to 15 MB (4 MB on Vercel)</p>
        <Button onClick={() => input.current?.click()} loading={!!uploading}>
          {uploading ? `Uploading ${uploading.done}/${uploading.total}…` : "Choose files"}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="group" aria-label="Filter" className="flex gap-1">
          {(["all", "image", "pdf"] as const).map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("rounded-lg px-3 py-2 text-sm", filter === f ? "bg-white/10 text-ink" : "text-muted hover:text-ink")}>
              {f === "all" ? "All" : f === "image" ? "Images" : "PDFs"}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <span className="sr-only">Search files</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or description…" className={cn(inputCls, "pl-9")} />
        </label>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState text={error} onRetry={load} />
        ) : media === null ? (
          <Spinner label="Loading your files…" />
        ) : media.length === 0 ? (
          <EmptyState title="Your media library is empty" text="Upload your photos, certificate scans and résumé to use them across the site." />
        ) : shown.length === 0 ? (
          <NoResults
            query={q || filter}
            onReset={() => {
              setQ("");
              setFilter("all");
            }}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-2xl border border-line bg-white/[0.025]">
                <a href={m.url} target="_blank" rel="noopener" className="block aspect-[4/3] bg-black/40">
                  {m.mime.startsWith("image/") ? (
                    <img src={m.url} alt={m.alt || m.filename} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted">
                      <FileText className="size-10" aria-hidden />
                    </span>
                  )}
                </a>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm text-ink" title={m.filename}>
                    {m.filename}
                  </p>
                  <p className="text-xs text-faint">
                    {formatBytes(m.size)} · {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                  <label className="block">
                    <span className="sr-only">Image description (alt text)</span>
                    <input defaultValue={m.alt} placeholder="Describe the image (alt text)" maxLength={300} onBlur={(e) => saveAlt(m, e.target.value.trim())} className={cn(inputCls, "py-1.5 text-xs")} />
                  </label>
                  <div className="flex justify-between">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(m.url);
                          setCopied(m.id);
                          setTimeout(() => setCopied(null), 1500);
                        } catch {
                          toast.error("Copy failed");
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-white/5 hover:text-ink"
                    >
                      {copied === m.id ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />} {copied === m.id ? "Copied" : "Copy link"}
                    </button>
                    <button onClick={() => setDel(m)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="size-3.5" aria-hidden /> Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete file?">
        <div className="p-5">
          <p className="text-sm text-muted">
            <strong className="text-ink">{del?.filename}</strong> will be permanently deleted. Any section still using it will show an empty image until you choose another.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDel(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => del && remove(del)}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
