"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-4 z-[95] mx-auto flex w-fit items-center gap-2 rounded-full border border-warn/40 bg-bg-2/95 px-4 py-2 text-sm text-warn shadow-xl">
      <WifiOff className="size-4" aria-hidden /> You&apos;re offline — some content may not load until you reconnect.
    </div>
  );
}
