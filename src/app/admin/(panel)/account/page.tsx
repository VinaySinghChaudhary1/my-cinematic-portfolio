import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/server/auth";
import { PageHeader, Card } from "@/components/admin/ui";
import { AccountForms } from "@/components/admin/AccountForms";

const LABEL: Record<string, string> = {
  login: "Signed in",
  login_failed: "Failed sign-in attempt",
  logout: "Signed out",
  logout_all: "Signed out of all devices",
  password_changed: "Password changed",
  settings_updated: "Settings updated",
  section_updated: "Section updated",
  item_created: "Entry added",
  item_updated: "Entry updated",
  item_deleted: "Entry deleted",
  media_uploaded: "File uploaded",
  media_deleted: "File deleted",
};

export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const log = await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(40);
  return (
    <>
      <PageHeader title="Account & security" description={`Signed in as ${user.email}${user.lastLoginAt ? ` · last sign-in ${new Date(user.lastLoginAt).toLocaleString()}` : ""}`} />
      <AccountForms />
      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Recent activity</h2>
        <p className="mt-1 text-sm text-muted">Sign-ins and changes, newest first. Unexpected failed sign-ins? Change your password.</p>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No activity yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-faint">
                <tr>
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Event</th>
                  <th className="py-2 pr-4 font-medium">Detail</th>
                  <th className="py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {log.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap py-2 pr-4 text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className={`py-2 pr-4 ${l.action === "login_failed" ? "text-danger" : "text-ink"}`}>{LABEL[l.action] ?? l.action}</td>
                    <td className="max-w-xs truncate py-2 pr-4 text-muted">{l.detail}</td>
                    <td className="py-2 font-mono text-xs text-faint">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
