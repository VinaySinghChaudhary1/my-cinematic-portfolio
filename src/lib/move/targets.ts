/**
 * Hosting targets for Admin → Move & domain: the steps and the environment variables each host needs.
 * Pure data + helpers (no secrets, no server code) so the admin page and the tests can both use it.
 * Variable names must match what the code reads (see docs/DEPLOYMENT.md).
 */

export type TargetId = "vercel" | "vps" | "docker" | "hostinger" | "render" | "netlify";

export interface EnvVar {
  name: string;
  need: "required" | "first-start" | "recommended" | "optional";
  /** What to put in it — never a real value. */
  hint: string;
  /** Pre-filled in the downloaded template (only non-secret values). */
  value?: string;
  secret?: boolean;
}

export interface Target {
  id: TargetId;
  label: string;
  summary: string;
  database: string;
  files: string;
  cost: string;
  steps: string[];
  env: EnvVar[];
  dns: string;
}

const common = (siteUrl: string): EnvVar[] => [
  { name: "SITE_URL", need: "required", hint: "Your address. Can also be changed later in Admin → Site settings → Website address.", value: siteUrl },
  { name: "AUTH_SECRET", need: "required", hint: "32+ random characters. Use the SAME value as the old host to keep saved AI keys working; a new value just means re-entering them.", secret: true },
  { name: "ADMIN_EMAIL", need: "first-start", hint: "Creates the admin account on the empty new database.", secret: true },
  { name: "ADMIN_PASSWORD", need: "first-start", hint: "12+ characters with upper, lower and a digit. Change it after the transfer if you like.", secret: true },
  { name: "RESEND_API_KEY", need: "optional", hint: "Resend → API Keys (Sending access). Emails are skipped without it.", secret: true },
  { name: "EMAIL_FROM", need: "optional", hint: "e.g. Your Name <noreply@your-domain> — the domain must be verified in Resend." },
  { name: "GOOGLE_CLIENT_ID", need: "optional", hint: "Google Cloud → Clients → your Web client. Add the new address to its origins and redirect URIs.", secret: true },
  { name: "GOOGLE_CLIENT_SECRET", need: "optional", hint: "Same place as the client ID.", secret: true },
  { name: "NEXT_TELEMETRY_DISABLED", need: "optional", hint: "1 = no Next.js telemetry.", value: "1" },
];

const turso: EnvVar[] = [
  { name: "DATABASE_URL", need: "required", hint: "Turso → your database → URL (libsql://…). A new empty database is fine — the transfer fills it.", secret: true },
  { name: "DATABASE_AUTH_TOKEN", need: "required", hint: "Turso → database → Create token (read & write).", secret: true },
];
const dataDir = (path: string): EnvVar => ({ name: "DATA_DIR", need: "required", hint: `A folder that survives redeploys (database, uploads, backups), e.g. ${path}.`, value: path });
const cron: EnvVar = { name: "CRON_SECRET", need: "recommended", hint: "16+ random characters — lets a cron job trigger scheduled backups.", secret: true };
const s3: EnvVar[] = [
  { name: "S3_BUCKET", need: "required", hint: "Bucket name (e.g. Cloudflare R2, free 10 GB)." },
  { name: "S3_ENDPOINT", need: "required", hint: "R2: https://<account-id>.r2.cloudflarestorage.com" },
  { name: "S3_REGION", need: "optional", hint: "R2: auto", value: "auto" },
  { name: "S3_ACCESS_KEY_ID", need: "required", hint: "R2 → Manage API tokens.", secret: true },
  { name: "S3_SECRET_ACCESS_KEY", need: "required", hint: "Same token.", secret: true },
  { name: "S3_PUBLIC_URL", need: "required", hint: "Public bucket address (R2 public domain or your CDN)." },
];

export function targets(siteUrl: string): Target[] {
  const host = (() => {
    try {
      return new URL(siteUrl).hostname;
    } catch {
      return "your-domain";
    }
  })();
  return [
    {
      id: "vercel",
      label: "Vercel (new account or project)",
      summary: "What runs today. Serverless, free Hobby plan, deploys from GitHub.",
      database: "Turso",
      files: "Vercel Blob",
      cost: "Free",
      steps: [
        "vercel.com → Add New → Project → import the GitHub repo (framework: Next.js).",
        "Create a Turso database (turso.tech) and copy its URL and a token.",
        "Project → Storage → Create → Blob (adds BLOB_READ_WRITE_TOKEN automatically).",
        "Project → Settings → Environment Variables → add the variables below → Deploy.",
        "Open the new *.vercel.app address → /admin → sign in → Move & domain → Receive from old site.",
        "Project → Settings → Domains → add your domain, then change DNS at your registrar (below).",
      ],
      env: [...common(siteUrl), ...turso, { name: "BLOB_READ_WRITE_TOKEN", need: "required", hint: "Added by Vercel when you connect a Blob store.", secret: true }, cron],
      dns: `A @ → 76.76.21.21 · CNAME www → ${host}. (Vercel shows the exact values under Domains)`,
    },
    {
      id: "vps",
      label: "VPS (Hostinger VPS, DigitalOcean, Hetzner, Oracle free…)",
      summary: "Your own Linux server. Most control; the database is a file on the server.",
      database: "SQLite file in DATA_DIR",
      files: "Server disk (DATA_DIR)",
      cost: "≈ ₹300–600 / month",
      steps: [
        "Install Node.js 22+ and git on the server.",
        "git clone the repo → create .env.production with the variables below (DATA_DIR outside the project folder).",
        "npm ci && npm run build → npx pm2 start \"npm start\" --name portfolio && npx pm2 save",
        "Install Caddy for free HTTPS: in /etc/caddy/Caddyfile put `" + host + " { reverse_proxy localhost:3000 }`.",
        "Open the server's IP or temporary address → /admin → Move & domain → Receive from old site.",
        "Point DNS to the server's IP (below); Caddy gets the certificate automatically.",
      ],
      env: [...common(siteUrl), dataDir("/var/lib/portfolio"), cron],
      dns: "A @ → your server's IPv4 · A www → same IP (or CNAME www → @)",
    },
    {
      id: "docker",
      label: "Docker (Coolify, Dokploy, Portainer, any VPS)",
      summary: "Same as a VPS, packaged. Dockerfile and docker-compose.yml are included.",
      database: "SQLite in the volume",
      files: "Docker volume",
      cost: "Your server",
      steps: [
        "Copy .env.example to .env.production and fill in the variables below (DATA_DIR is /app/data in the image).",
        "docker compose up -d — data lives in the portfolio-data volume.",
        "Put HTTPS in front (Coolify/Dokploy do this for you, or Caddy).",
        "Open the new address → /admin → Move & domain → Receive from old site.",
        "Point DNS to the server (below).",
      ],
      env: [...common(siteUrl), { name: "DATA_DIR", need: "optional", hint: "Already /app/data inside the image.", value: "/app/data" }, cron],
      dns: "A @ → your server's IPv4 · A www → same IP",
    },
    {
      id: "hostinger",
      label: "Hostinger Node.js web app (Business / Cloud plans)",
      summary: "Managed Node hosting. The build folder is wiped on each deploy — keep data outside it or use Turso + R2.",
      database: "SQLite outside the build folder, or Turso",
      files: "Disk outside the build folder, or R2",
      cost: "Plan price",
      steps: [
        "hPanel → Websites → Add website → Node.js app → connect the GitHub repo (framework Next.js, build `npm run build`, start `npm start`).",
        "Add the variables below. DATA_DIR must be outside the build folder (e.g. /home/<user>/portfolio-data).",
        "Deploy, open the temporary address → /admin → Move & domain → Receive from old site.",
        "Connect your domain in hPanel (or point DNS to Hostinger as hPanel shows).",
      ],
      env: [...common(siteUrl), dataDir("/home/<your-user>/portfolio-data"), cron],
      dns: "Use the A record / nameservers hPanel shows for the website",
    },
    {
      id: "render",
      label: "Render / Railway / Fly.io",
      summary: "Managed containers from GitHub. Needs a persistent disk, or Turso + R2.",
      database: "SQLite on a persistent disk, or Turso",
      files: "Persistent disk, or R2",
      cost: "≈ $7 / month with a disk",
      steps: [
        "New Web Service from the GitHub repo: build `npm ci && npm run build`, start `npm start`.",
        "Attach a persistent disk (e.g. mounted at /var/data) and set DATA_DIR to it — or use Turso + R2 instead.",
        "Add the variables below → deploy → open the *.onrender.com (or similar) address.",
        "/admin → Move & domain → Receive from old site.",
        "Add your domain in the service's Custom Domains and copy the DNS values it shows.",
      ],
      env: [...common(siteUrl), dataDir("/var/data"), cron],
      dns: "Use the values the host's “Custom domain” page shows (usually A @ and CNAME www)",
    },
    {
      id: "netlify",
      label: "Netlify / other serverless",
      summary: "Serverless like Vercel; files must go to an S3 bucket such as Cloudflare R2.",
      database: "Turso",
      files: "Cloudflare R2 / any S3",
      cost: "Free tiers",
      steps: [
        "Import the GitHub repo (Next.js runtime is detected automatically).",
        "Create a Turso database and an R2 bucket with a public domain.",
        "Add the variables below and deploy.",
        "/admin → Move & domain → Receive from old site.",
        "Scheduled backups: add the included GitHub Action or cron-job.org calling /api/cron/backup with CRON_SECRET.",
        "Add your domain in the host and copy the DNS values it shows.",
      ],
      env: [...common(siteUrl), ...turso, ...s3, { ...cron, need: "required" }],
      dns: "Use the values the host shows (usually A @ / ALIAS and CNAME www)",
    },
  ];
}

/** A .env template for the chosen host: names, short explanations, non-secret defaults only. */
export function envTemplate(t: Target): string {
  const lines = [`# Environment variables for ${t.label}`, "# Fill in the empty values in your host's settings. Never commit real secrets to git.", ""];
  for (const v of t.env) {
    lines.push(`# ${v.need.toUpperCase()} — ${v.hint}`);
    lines.push(`${v.name}=${v.secret ? "" : (v.value ?? "")}`);
    lines.push("");
  }
  return lines.join("\n");
}
