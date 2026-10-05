"use client";
export function RetryButton() {
  return (
    <div className="mt-6 flex justify-center gap-3">
      <button onClick={() => location.reload()} className="rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-medium text-white">
        Try again
      </button>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page load so the service worker can serve it */}
      <a href="/" className="rounded-xl border border-line px-5 py-2.5 text-sm text-ink">
        Home
      </a>
    </div>
  );
}
