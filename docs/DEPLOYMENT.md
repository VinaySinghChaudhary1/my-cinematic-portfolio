# Deployment guide

The app is a single Next.js server. It needs two things that survive restarts:

1. **A database** – SQLite file locally; on serverless hosts use **Turso** (free hosted SQLite/libSQL).
2. **File storage for uploads** – the `data/uploads` folder on a normal server; **Vercel Blob** on Vercel.

| Host | Database | Uploads | Cost |
|---|---|---|---|
| **Vercel** (recommended) | Turso (`libsql://…`) | Vercel Blob | Free tiers |
| Render / Railway | SQLite file on a persistent disk, or Turso | `data/uploads` on the disk, or Vercel Blob | small monthly fee for a disk |
| VPS / Docker | SQLite file | `data/uploads` | your server |

> ⚠️ Never deploy to Vercel with `DATABASE_URL=file:…` — Vercel's disk is wiped on every deploy, so content would be lost. The app logs a warning if you do.

---

## A. Vercel + Turso + Vercel Blob (recommended)

1. **Push the project to GitHub** (private repo is fine). `.env.local` and `data/` are git‑ignored — never commit them.
2. **Create the database** at [turso.tech](https://turso.tech): create a database → copy its **URL** (`libsql://…`) and create a **token**.
3. **Seed it from your computer** – edit `.env.local`:
   ```env
   DATABASE_URL=libsql://your-db-name.turso.io
   DATABASE_AUTH_TOKEN=your-token
   ```
   then run `npm run setup`. This creates the tables, your content (demo or yours) and the admin account in the cloud DB.
   *(Tip: keep a copy of your local `DATABASE_URL=file:./data/portfolio.db` line commented out to switch back.)*
4. **Import the repo in Vercel** → Add **Environment Variables**:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your `libsql://…` URL |
   | `DATABASE_AUTH_TOKEN` | your Turso token |
   | `AUTH_SECRET` | a long random string (copy from `.env.local` or generate a new one) |
   | `SITE_URL` | `https://your-domain.vercel.app` (your final domain) |
5. **Storage → Create → Blob** in the Vercel project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically. Redeploy.
6. Visit `/admin`, sign in, and **change your password**.
7. When the content is real: Admin → Site settings → SEO → enable *Allow search engines*.

**Limits on Vercel:** request bodies are capped at ~4.5 MB. Photos are compressed in the browser before upload, so they fit; keep certificate **PDFs under 4 MB**.

### Custom domain
Vercel → Project → Settings → Domains → add `yourname.com` and follow the DNS steps. Update `SITE_URL`.

---

## B. Render / Railway (one Node server with a disk)

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Attach a **persistent disk** mounted at `/opt/render/project/src/data` (Render) or the app's `data` folder (Railway).
- Env vars: `DATABASE_URL=file:./data/portfolio.db`, `AUTH_SECRET=…`, `SITE_URL=https://…`, plus `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the first setup.
- Run `npm run setup` once from the host's shell.

## C. VPS / Docker

```bash
git clone <your repo> portfolio && cd portfolio
npm ci && npm run setup && npm run build
PORT=3000 npm start          # keep alive with pm2 or systemd; put Nginx/Caddy in front for HTTPS
```
Back up `data/portfolio.db` and `data/uploads/` regularly.

---

## Pre‑launch checklist

- [ ] Strong `AUTH_SECRET` set in the host (not the dev default)
- [ ] Admin password changed from the generated one
- [ ] Demo content replaced (dashboard checklist shows ✔)
- [ ] Privacy notice written with real details and published (the contact form collects names & emails)
- [ ] `SITE_URL` set to the real domain; search indexing enabled
- [ ] `/api/health` returns `{"ok":true}`
- [ ] Upload a test photo and PDF in production and view them on the site
