"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible dialog built on <dialog>: focus trap, Esc to close, restores focus, locks scroll. */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={() => {
        document.documentElement.style.overflow = "";
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[92dvh] w-[min(96vw,var(--w))] overflow-hidden rounded-2xl border border-line bg-bg-2/95 p-0 text-ink shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm",
        className,
      )}
      style={{ ["--w" as string]: wide ? "1100px" : "640px" }}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
            <h2 className="truncate font-display text-base font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Close dialog" className="grid size-9 place-items-center rounded-full hover:bg-white/10">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}
