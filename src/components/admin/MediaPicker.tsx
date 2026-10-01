"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileText, Check, Search, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Spinner, EmptyState, ErrorState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { isSafeMediaUrl } from "@/lib/validation";
import { api, uploadFile, type MediaItem } from "./api";
import { Button, inputCls } from "./ui";

/** Choose an existing upload, upload a new one, or paste an https URL. */
export function MediaPicker({
  open,
  onClose,
  onPick,
  kind,
  multiple,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
  kind: "image" | "pdf";
  multiple?: boolean;
}) {
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api<{ media: MediaItem[] }>("/api/admin/media");
      setMedia(r.media);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media");
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setUrl("");
      load();
    }
  }, [open, load]);

  const list = (media ?? [])
    .filter((m) => (kind === "pdf" ? m.mime === "application/pdf" : m.mime.startsWith("image/")))
    .filter((m) => !q || m.filename.toLowerCase().includes(q.toLowerCase()) || m.alt.toLowerCase().includes(q.toLowerCase()));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const uploaded: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const m = await uploadFile(f, kind === "pdf" ? "documents" : "images");
        uploaded.push(m.url);
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }
    setBusy(false);
    if (uploaded.length) {
      toast.success(`Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}`);
      await load();
      setSelected((s) => (multiple ? [...s, ...uploaded] : uploaded.slice(0, 1)));
    }
  }

  const toggle = (u: string) => setSelected((s) => (multiple ? (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]) : [u]));

  return (
    <Modal open={open} onClose={onClose} title={kind === "pdf" ? "Choose a PDF" : multiple ? "Choose images" : "Choose an image"} wide>
      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={() => fileRef.current?.click()} loading={busy}>
            <Upload className="size-4" aria-hidden /> Upload {kind === "pdf" ? "PDF" : "images"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple={multiple}
            accept={kind === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp,image/gif,image/avif"}
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <label className="relative flex-1">
            <span className="sr-only">Search media</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by file name…" className={cn(inputCls, "pl-9")} />
          </label>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
          className="min-h-[260px] rounded-xl border border-dashed border-line p-3"
        >
          {error ? (
            <ErrorState text={error} onRetry={load} />
          ) : media === null ? (
            <Spinner label="Loading media…" />
          ) : list.length === 0 ? (
            <EmptyState title={q ? "No matching files" : "No files yet"} text="Drag & drop files here or use the Upload button." />
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {list.map((m) => {
                const on = selected.includes(m.url);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggle(m.url)}
                      aria-pressed={on}
                      title={m.filename}
                      className={cn("relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-black/40", on ? "border-accent-2" : "border-transparent hover:border-line")}
                    >
                      {m.mime.startsWith("image/") ? (
                        <img src={m.url} alt={m.alt || m.filename} className="size-full object-cover" loading="lazy" />
                      ) : (
                        <span className="grid size-full place-items-center p-2 text-center text-[11px] text-muted">
                          <FileText className="mb-1 size-6" aria-hidden />
                          {m.filename}
                        </span>
                      )}
                      {on && (
                        <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-accent-2 text-bg">
                          <Check className="size-4" aria-hidden />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Or paste an https URL</span>
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an https:// link" className={cn(inputCls, "pl-9")} />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selected.length && !url}
              onClick={() => {
                if (url && !isSafeMediaUrl(url.trim())) return toast.error("Links must start with https://");
                onPick(url ? [...selected, url.trim()] : selected);
                onClose();
              }}
            >
              Use {selected.length + (url ? 1 : 0) || ""} selected
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
