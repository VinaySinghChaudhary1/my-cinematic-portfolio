"use client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({
  children,
  variant = "primary",
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline"; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-gradient-to-r from-accent to-accent-2 text-white shadow-[0_6px_24px_-8px_var(--accent)] hover:brightness-110",
        variant === "outline" && "border border-line bg-white/[0.03] text-ink hover:border-accent/60",
        variant === "ghost" && "text-muted hover:bg-white/5 hover:text-ink",
        variant === "danger" && "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string; disabled?: boolean }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition disabled:opacity-50",
        checked ? "border-transparent bg-gradient-to-r from-accent to-accent-2" : "border-line bg-white/10",
      )}
    >
      <span className={cn("inline-block size-4 rounded-full bg-white shadow transition", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-white/[0.025] p-5 md:p-6", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-black/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-accent-2 focus:outline-none aria-[invalid=true]:border-danger";
