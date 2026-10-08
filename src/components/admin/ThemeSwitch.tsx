"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { ADMIN_THEME_COOKIE, type AdminTheme } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AdminTheme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor },
];

/** Resolves "system" to the device setting. */
export function resolveTheme(t: AdminTheme): "light" | "dark" {
  if (t !== "system") return t;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function saveAdminTheme(t: AdminTheme) {
  document.cookie = `${ADMIN_THEME_COOKIE}=${t}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
}

/** Segmented Light / Dark / Auto control (sidebar). */
export function ThemeSwitch({ value, onChange }: { value: AdminTheme; onChange: (t: AdminTheme) => void }) {
  return (
    <div role="radiogroup" aria-label="Admin theme" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-white/[0.03] p-1">
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          title={v === "system" ? "Follow this device's setting" : `${label} theme`}
          onClick={() => onChange(v)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition",
            value === v ? "bg-white/10 font-medium text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

/** One-tap toggle for the mobile top bar: cycles Dark → Light → Auto. */
export function ThemeCycleButton({ value, onChange }: { value: AdminTheme; onChange: (t: AdminTheme) => void }) {
  const i = OPTIONS.findIndex((o) => o.value === value);
  const { Icon, label } = OPTIONS[i];
  const next = OPTIONS[(i + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      onClick={() => onChange(next.value)}
      aria-label={`Theme: ${label}. Switch to ${next.label}`}
      title={`Theme: ${label}`}
      className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:text-ink"
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  );
}
