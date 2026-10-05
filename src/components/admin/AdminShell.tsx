"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Image as ImageIcon, Inbox, Settings, UserCog, LogOut, ExternalLink, Menu, X, Wrench, Archive, Sparkles, FlaskConical, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/sections", label: "Sections & content", Icon: Layers },
  { href: "/admin/media", label: "Media library", Icon: ImageIcon },
  { href: "/admin/import", label: "Bulk import", Icon: FileUp },
  { href: "/admin/messages", label: "Messages", Icon: Inbox },
  { href: "/admin/settings", label: "Site settings", Icon: Settings },
  { href: "/admin/testers", label: "Beta testers", Icon: FlaskConical },
  { href: "/admin/ai", label: "AI assistant", Icon: Sparkles },
  { href: "/admin/backups", label: "Backups", Icon: Archive },
  { href: "/admin/account", label: "Account & security", Icon: UserCog },
];

export function AdminShell({ children, email, name, initials, unread, maintenance }: { children: React.ReactNode; email: string; name: string; initials: string; unread: number; maintenance: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      toast.error("Network error while signing out");
    }
    window.location.assign("/admin/login");
  }

  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col gap-1 p-3">
      <Link href="/admin" className="mb-4 flex items-center gap-3 px-2 py-2">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 font-display text-sm font-bold text-white">{initials || "A"}</span>
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-semibold text-ink">{name}</span>
          <span className="block text-[11px] uppercase tracking-wider text-faint">Admin panel</span>
        </span>
      </Link>
      {NAV.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            isActive(href) ? "bg-white/[0.08] text-ink" : "text-muted hover:bg-white/[0.04] hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden />
          <span className="flex-1">{label}</span>
          {href === "/admin/messages" && unread > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white" aria-label={`${unread} unread`}>
              {unread}
            </span>
          )}
        </Link>
      ))}
      <div className="mt-auto space-y-1 border-t border-line pt-3">
        <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-white/[0.04] hover:text-ink">
          <ExternalLink className="size-4" aria-hidden /> View website
        </a>
        <button onClick={logout} disabled={busy} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-danger/10 hover:text-danger">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
        <p className="truncate px-3 pt-1 text-[11px] text-faint" title={email}>
          {email}
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#07060f] lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-bg lg:block">{nav}</aside>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="font-display text-sm font-semibold">Admin</span>
        <button onClick={() => setOpen(true)} aria-label="Open admin menu" aria-expanded={open} className="grid size-10 place-items-center rounded-lg border border-line">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-line bg-bg">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg hover:bg-white/10">
              <X className="size-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}
      <main id="main" className="min-w-0 px-4 py-8 md:px-8 lg:px-12">
        {maintenance && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
            <Wrench className="size-4" aria-hidden /> Maintenance mode is ON — visitors see the maintenance screen.
            <Link href="/admin/settings#maintenance" className="ml-auto underline">
              Change
            </Link>
          </div>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
