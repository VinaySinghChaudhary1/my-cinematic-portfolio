import { AlertTriangle, Inbox, Loader2, SearchX, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 py-10 text-muted", className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-glass text-muted">{icon ?? <Inbox className="size-5" />}</div>
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {text && <p className="max-w-md text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function NoResults({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <EmptyState
      icon={<SearchX className="size-5" />}
      title={`No results for “${query}”`}
      text="Try a different keyword or clear the filters."
      action={
        <button onClick={onReset} className="mt-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-accent">
          Clear search & filters
        </button>
      }
    />
  );
}

export function ErrorState({ title = "Something went wrong", text, onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <AlertTriangle className="size-6 text-danger" aria-hidden />
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {text && <p className="max-w-md text-sm text-muted">{text}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-1 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg">
          Try again
        </button>
      )}
    </div>
  );
}

export function SuccessState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-6 py-10 text-center">
      <CheckCircle2 className="size-7 text-success" aria-hidden />
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {text && <p className="max-w-md text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}
