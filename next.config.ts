import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained server build for Docker / VPS / Hostinger / any Node host (Vercel ignores this).
  output: "standalone",
  // Runtime data (database, uploads, backups) never ships in the build — see also scripts/clean-standalone.mjs (postbuild).
  outputFileTracingExcludes: { "*": ["data/**", "backups/**", "content/backups/**", "docs/**/*.pdf"] },
  reactStrictMode: true,
  serverExternalPackages: ["@libsql/client", "libsql", "sharp"],
  experimental: {
    // allow certificate PDFs / large photos through route handlers
    proxyClientMaxBodySize: "20mb",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // the service worker must always be re-checked so updates reach installed apps quickly
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/icons/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};

export default nextConfig;
