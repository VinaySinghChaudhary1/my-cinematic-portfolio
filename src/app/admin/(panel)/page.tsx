import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { Layers, Image as ImageIcon, Inbox, Eye, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { db, schema } from "@/db";
import { getAllSections, getSettings } from "@/lib/server/content";
import { getCurrentUser } from "@/lib/server/auth";
import { Card, PageHeader } from "@/components/admin/ui";

export default async function Dashboard() {
  const [sections, settings, user, [{ items }], [{ media }], [{ unread }], recent, [{ backupCount }]] = await Promise.all([
    getAllSections(),
    getSettings(),
    getCurrentUser(),
    db.select({ items: count() }).from(schema.items),
    db.select({ media: count() }).from(schema.media),
    db.select({ unread: count() }).from(schema.messages).where(eq(schema.messages.read, false)),
    db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)).limit(4),
    db.select({ backupCount: count() }).from(schema.backups),
  ]);
  const enabled = sections.filter((s) => s.enabled).length;
  const usingDemo = settings.profile.name === "Your Name" || settings.profile.avatar.startsWith("/demo/");

  const checklist = [
    { done: !usingDemo, label: "Replace demo name & photo", href: "/admin/settings" },
    { done: !settings.profile.resume.startsWith("/demo/") && !!settings.profile.resume, label: "Upload your real résumé (PDF)", href: "/admin/settings" },
    { done: (user?.sessionVersion ?? 1) > 1, label: "Change the generated admin password", href: "/admin/account" },
    { done: settings.privacy.published, label: "Write & publish your privacy notice", href: "/admin/settings#privacy" },
    { done: settings.seo.indexable, label: "Allow search engines once ready to launch", href: "/admin/settings#seo" },
    { done: backupCount > 0, label: "Download your first full backup", href: "/admin/backups" },
  ];

  const stats = [
    { label: "Sections live", value: `${enabled}/${sections.length}`, Icon: Layers, href: "/admin/sections" },
    { label: "Content entries", value: items, Icon: Eye, href: "/admin/sections" },
    { label: "Files uploaded", value: media, Icon: ImageIcon, href: "/admin/media" },
    { label: "Unread messages", value: unread, Icon: Inbox, href: "/admin/messages" },
  ];

  return (
    <>
      <PageHeader title={`Welcome back 👋`} description="Everything on your portfolio can be changed from here — no code, no redeploy." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="block rounded-2xl border border-line bg-white/[0.025] p-5 transition hover:border-accent/50">
              <s.Icon className="size-5 text-accent-2" aria-hidden />
              <p className="mt-4 font-display text-3xl font-semibold text-ink">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Launch checklist</h2>
          <p className="mt-1 text-sm text-muted">Finish these before sharing your link.</p>
          <ul className="mt-4 space-y-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-white/5">
                  {c.done ? <CheckCircle2 className="size-5 text-success" aria-label="Done" /> : <Circle className="size-5 text-faint" aria-label="To do" />}
                  <span className={c.done ? "text-muted line-through" : "text-ink"}>{c.label}</span>
                  <ArrowRight className="ml-auto size-4 text-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Latest messages</h2>
            <Link href="/admin/messages" className="text-sm text-accent-2 hover:underline">
              Open inbox
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No messages yet. They&apos;ll appear here when visitors use your contact form.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((m) => (
                <li key={m.id} className="py-3">
                  <p className="flex items-center gap-2 text-sm text-ink">
                    {!m.read && <span className="size-2 rounded-full bg-accent" aria-label="Unread" />}
                    {m.name} <span className="text-faint">· {new Date(m.createdAt).toLocaleDateString()}</span>
                  </p>
                  <p className="truncate text-sm text-muted">{m.subject || m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Sections at a glance</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {sections.map((s) => (
            <li key={s.key}>
              <Link
                href={`/admin/sections/${s.key}`}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${s.enabled ? "border-success/30 text-ink" : "border-line text-faint line-through"}`}
              >
                <span className={`size-1.5 rounded-full ${s.enabled ? "bg-success" : "bg-faint"}`} aria-hidden />
                {s.title}
                <span className="sr-only">{s.enabled ? "(on)" : "(off)"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
