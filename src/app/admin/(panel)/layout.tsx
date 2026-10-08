import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_THEME_COOKIE, parseAdminTheme } from "@/lib/admin-theme";
import "../admin-theme.css";
import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/content";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    // token valid but revoked (password changed / logged out everywhere)
    redirect("/admin/login?reason=expired");
  }
  const theme = parseAdminTheme((await cookies()).get(ADMIN_THEME_COOKIE)?.value);
  const [s, [{ unread }]] = await Promise.all([
    getSettings(),
    db.select({ unread: count() }).from(schema.messages).where(eq(schema.messages.read, false)),
  ]);
  return (
    <AdminShell email={user.email} name={s.profile.name} initials={s.profile.initials} unread={unread} maintenance={s.maintenance.enabled} theme={theme}>
      {children}
    </AdminShell>
  );
}
