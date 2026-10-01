import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/content";
import { safeAdminReturnPath } from "@/lib/validation";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const sp = await searchParams;
  const next = safeAdminReturnPath(sp.next);
  if (await getCurrentUser()) redirect(next);
  const s = await getSettings();
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--accent)_25%,transparent),transparent_55%),radial-gradient(circle_at_80%_80%,color-mix(in_oklab,var(--accent-2)_18%,transparent),transparent_50%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 font-display text-lg font-bold text-white shadow-[0_0_40px_-6px_var(--accent)]">
            {s.profile.initials || "A"}
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Portfolio control room</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage {s.profile.name}&apos;s site</p>
        </div>
        <LoginForm next={next} expired={sp.reason === "expired"} />
        <p className="mt-6 text-center text-xs text-faint">
          <Link href="/" className="hover:text-ink">← Back to the website</Link>
        </p>
      </div>
    </main>
  );
}
