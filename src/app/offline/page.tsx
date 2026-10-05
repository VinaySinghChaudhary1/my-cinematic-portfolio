import { WifiOff } from "lucide-react";
import { RetryButton } from "./RetryButton";

export const metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker when a page isn't cached and there's no connection. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#05040b] p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl border border-line bg-white/[0.04] text-accent-2">
          <WifiOff className="size-6" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold text-ink">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted">This page hasn&apos;t been saved on your device yet. Pages you&apos;ve already opened still work — reconnect to see the rest.</p>
        <RetryButton />
      </div>
    </main>
  );
}
