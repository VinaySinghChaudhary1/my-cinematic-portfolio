# Deployment guide — any host

The site is one Node.js (Next.js) server. It runs on **any host that runs Node.js 20+ or Docker**. It needs three things that survive restarts and redeploys:

| Need | Option A: on the server's disk | Option B: cloud service (for hosts with a temporary disk) |
|---|---|---|
| **Database** | SQLite file in `DATA_DIR` | **Turso** / any libSQL URL (`DATABASE_URL=libsql://…`) |
| **Uploads** (photos, PDFs) | `DATA_DIR/uploads` | **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) or any **S3-compatible** bucket — AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO (`S3_*`) |
| **Backups** kept on the server | `DATA_DIR/private` (encrypted) | same Blob store / bucket (encrypted, `private/` prefix) |

The app picks the storage automatically (`STORAGE_DRIVER=auto`): Blob if `BLOB_READ_WRITE_TOKEN` is set, S3 if `S3_BUCKET` is set, otherwise the local disk.

## Which host, which setup

| Host | Database | Files | Scheduled backups | How |
|---|---|---|---|---|
| **Vercel** | Turso | Vercel Blob | Vercel Cron (built in, `vercel.json`) | [A](#a-vercel) |
| **VPS** (Hostinger VPS, DigitalOcean, AWS EC2, Hetzner, Oracle Cloud…) | SQLite file | disk | built-in timer | [B](#b-vps-hostinger-vps-any-linux-server) |
| **Docker** (Coolify, Dokploy, Portainer, any VPS) | SQLite in a volume | volume | built-in timer | [C](#c-docker) |
| **Hostinger Node.js web app** (Business / Cloud plans) | SQLite outside the build folder, or Turso | disk outside the build folder, or R2/S3 | built-in timer | [D](#d-hostinger-nodejs-web-app) |
| **Render / Railway / Fly.io** | SQLite on a persistent disk, or Turso | disk, or R2/S3 | built-in timer | [E](#e-render-railway-flyio) |
| **Netlify / other serverless** | Turso | R2/S3 or Blob | external cron → `/api/cron/backup` | [F](#f-serverless-hosts-other-than-vercel) |

> **No shell on the host?** No problem. On first start the app creates its tables, adds demo content and creates the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Then sign in and use **Admin → Backups → Restore from a file** to load your real site.

## Environment variables

| Variable | Needed | What it does |
|---|---|---|
| `AUTH_SECRET` | **always** | 32+ random characters. Signs logins and encrypts server-side backup copies. Keep it the same forever (or set `BACKUP_SECRET`). |
| `SITE_URL` | always | Your public address, e.g. `https://vinaysinghchaudhary.me` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first start | Creates the first admin if none exists (password: 12+ chars, upper, lower, digit). |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | optional | Default `file:$DATA_DIR/portfolio.db`. Use `libsql://…` + token for Turso. |
| `DATA_DIR` | optional | Folder for the database file, uploads and backups. Default `./data`. **Must survive redeploys.** |
| `BLOB_READ_WRITE_TOKEN` | Vercel | Files in Vercel Blob. |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | optional | Files in any S3-compatible bucket. `S3_PUBLIC_URL` = the public base URL of the bucket (R2 public domain or CDN). `S3_FORCE_PATH_STYLE=false` for virtual-hosted-style URLs. |
| `STORAGE_DRIVER` | optional | Force `local`, `blob` or `s3`. |
| `CRON_SECRET` | for cron triggers | 16+ random characters. Required for `/api/cron/backup` (Vercel Cron sends it automatically). |
| `BACKUP_SECRET` | optional | Separate key for encrypting server-side backup copies, so changing `AUTH_SECRET` doesn't affect them. |
| `BACKUP_SCHEDULER` | optional | `off` disables the built-in timer (use an external cron instead). |
| `SEED_DEMO_CONTENT` | optional | `false` = start empty instead of with demo content. |

---

## A. Vercel

1. Push the repo to GitHub and **import it in Vercel**.
2. **Database:** create a free database at [turso.tech](https://turso.tech) → set `DATABASE_URL` (`libsql://…`) and `DATABASE_AUTH_TOKEN`.
3. **Files:** Vercel project → Storage → Create → **Blob** (adds `BLOB_READ_WRITE_TOKEN`).
4. Set `AUTH_SECRET`, `SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CRON_SECRET`. Deploy.
5. Sign in at `/admin` → **Backups → Restore from a file** (or run `npm run content:apply` locally against Turso).
6. Scheduled backups: turn them on in **Admin → Backups**. `vercel.json` already calls `/api/cron/backup` once a day.

Vercel limits each request/response to about 4.5 MB — backups are uploaded and downloaded in 4 MB parts, so this never matters.

## B. VPS (Hostinger VPS, any Linux server)

```bash
# once
git clone https://github.com/VinaySinghChaudhary1/my-cinematic-portfolio.git portfolio && cd portfolio
cp .env.example .env.production   # fill AUTH_SECRET, SITE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, DATA_DIR=/var/lib/portfolio
npm ci && npm run build
# run (keep alive with pm2 or systemd)
npx pm2 start "npm start" --name portfolio && npx pm2 save
```

- Put **Nginx or Caddy** in front for HTTPS (Caddy: `your-domain { reverse_proxy localhost:3000 }`).
- Keep `DATA_DIR` **outside the project folder** (e.g. `/var/lib/portfolio`) so `git pull` and rebuilds never touch your data.
- Update: `git pull && npm ci && npm run build && npx pm2 restart portfolio` — **take a backup first** (Admin → Backups).

## C. Docker

```bash
cp .env.example .env.production    # fill it in (DATA_DIR is set to /app/data inside the image)
docker compose up -d               # builds the image, keeps data in the "portfolio-data" volume
```

The image runs as a non-root user, has a health check (`/api/health`) and stores everything in the `/app/data` volume. Back up the volume or use Admin → Backups.

## D. Hostinger Node.js web app

Hostinger Business and Cloud plans can run Node.js apps from GitHub or a ZIP upload ([Hostinger guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger)). Files inside the build folder (`hbuilds/…`) and `public_html` are **overwritten on every deploy**, so:

1. Deploy from GitHub; framework **Next.js**, build `npm run build`, start `npm start`.
2. Environment variables: `AUTH_SECRET`, `SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and **`DATA_DIR=/home/<your-user>/portfolio-data`** (a folder outside the build directory).
   Safer alternative: Turso for the database and Cloudflare R2 (S3) for files — then nothing depends on the disk.
3. Open the site → `/admin` → restore your backup.
4. Scheduled backups run from the built-in timer. If the app sleeps when idle, also add the GitHub Actions trigger (below).

## E. Render / Railway / Fly.io

- Build `npm ci && npm run build`, start `npm start`.
- Attach a **persistent disk/volume** and set `DATA_DIR` to its mount path (e.g. `/var/data`). Without a disk, use Turso + R2/S3.

## F. Serverless hosts other than Vercel

Use Turso + S3/R2 (`isEphemeral` hosts refuse to write files to their temporary disk and show a warning). Trigger scheduled backups from outside — see next section.

---

## Scheduled backups — three ways to trigger them

The schedule (daily / weekly / monthly, how many to keep, what to include) is set in **Admin → Backups → Automatic backups**. Something just has to "knock" regularly; the site only makes a backup when one is due, and a database lock prevents duplicates.

1. **Built-in timer** — long-running servers (VPS, Docker, Hostinger, Render, Railway). Nothing to set up.
2. **Vercel Cron** — `vercel.json` calls `/api/cron/backup` daily with your `CRON_SECRET`.
3. **Any external cron** — `curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/backup`
   - GitHub Actions: `.github/workflows/scheduled-backup.yml` is included — add repo secrets `SITE_URL` and `CRON_SECRET`.
   - Linux crontab: `17 3 * * * curl -fsS -H "Authorization: Bearer XXX" https://your-site/api/cron/backup`
   - cron-job.org or similar.

Server-side backup copies live on the same host. **Download one now and then** (Admin → Backups → Download, password-protected) and keep it somewhere else — that is your protection if the host itself is lost.

## Moving to another host

1. Old site: Admin → Backups → Create backup → **Download** (with password).
2. New host: deploy the code (any section above) with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
3. New site: Admin → Backups → **Restore from a file** → enter the password → preview → Restore.
   Uploaded files are re-uploaded to the new storage and every link in your content is updated automatically.

## Pre-launch checklist

- [ ] Strong `AUTH_SECRET` (and optional `BACKUP_SECRET`) set — never the dev default
- [ ] `DATA_DIR` (or Turso + Blob/S3) survives a redeploy — test: upload a photo, redeploy, check it's still there
- [ ] Admin password changed after first login
- [ ] First full backup downloaded and stored off the server
- [ ] Privacy notice published; `SITE_URL` = real domain; search indexing enabled
- [ ] `/api/health` returns `{"ok":true}`
