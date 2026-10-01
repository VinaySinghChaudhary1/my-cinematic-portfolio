"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main role="alert" className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-danger/30 bg-danger/10">
          <AlertTriangle className="size-6 text-danger" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-3 text-muted">An unexpected error occurred while loading this page. Please try again.</p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-faint">
            Reference: <span className="select-all">{error.digest}</span>
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-bg">
            <RotateCcw className="size-4" aria-hidden /> Try again
          </button>
          <Link href="/" className="rounded-full border border-line px-6 py-3 text-ink">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
