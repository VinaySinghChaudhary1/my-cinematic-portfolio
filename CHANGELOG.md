# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [Unreleased]

## [1.5.1] — 2026-10-09 · Mobile cinematic hero & admin light/dark theme
### Fixed
- **Cinematic letterbox hero on phones and portrait tablets**: the wide hero video/photo was cropped to a thin off-centre slice (half a face). Upright screens now show the same full background as a laptop, panned to keep you in view (Admin → Hero → “Background focus on phones”, default 55 %), or — your choice in “Phones & tablets” — the whole video as a framed “cinema screen” above the name. Thinner letterbox bars no longer cover the buttons on small phones; only one video is ever loaded. Wide screens look exactly as before.
- Tester login dialog padding; compact Publishing control in the entry editor.
### Added
- **Admin theme: Light / Dark / Auto** (follows the device) — switch in the sidebar (and a one-tap button in the mobile top bar). Remembered per browser in a cookie and rendered by the server, so there is no flash on reload. Toasts follow the theme. The public site is unchanged.

## [1.5.0] — 2026-10-05 · Access, email, drafts, PWA, bulk import & chat
### Added
- **Beta testers** (Admin → Beta testers): create a login for a person (generated password shown once), send the invite by **email** or **WhatsApp** (wa.me link), expiry dates, "can see drafts", revoke / restore / new password / delete, last-seen and Google-linked status. Testers sign in at `/beta`, see the site during **maintenance** and **Beta-only sections**, and send feedback to Messages; they can never open the admin panel (separate cookie and token audience, lock-out after 8 failed logins)
- **Beta-only sections**: a "Beta" switch per section in Sections & content
- **Forgot password** for the admin and testers: emailed single-use links (30 min, only a hash stored, same answer whether or not the account exists) and a "password changed" notice; resetting signs out every session
- **Google sign-in** (optional): for the admin (only a linked account, linked in Account & security) and testers (matching invite email). PKCE + state + nonce, ID token verified against Google's keys
- **Email** via Resend's API (optional): new contact-message and beta-feedback alerts (Settings → Notifications), tester invites, test email button
- **Drafts & scheduled publishing** for every entry (Published / Draft / Scheduled date-time) with list badges; drafts preview for you and allowed testers from the top bar; kept in backups and content files (`draft`, `publishAt`, section `audience`)
- **Installable app & offline cache** (PWA): web manifest + icons, service worker (static files cache-first, images stale-while-revalidate, pages network-first with an offline page); admin / API / beta / signed-in views are never cached
- **Bulk import** (Admin → Bulk import): résumé PDF/photo/text read by your AI providers, or a LinkedIn data-export ZIP (read in the browser, no AI needed) → review list with duplicate detection and inline editing → added as drafts after an automatic "Before bulk import" backup
- **"Ask about me" chat** (Admin → AI assistant): off / beta testers & me / everyone; answers only from published content plus your notes; per-visitor and daily limits; chosen provider; no transcripts stored
- `docs/EMAIL-AND-ACCESS.md`; 19 new tests (tokens, tester auth & lock-out, session isolation, Google URL, drafts/scheduling/beta filtering, content format, LinkedIn CSV mapping, import review/apply, chat grounding)
### Changed
- AI settings: the old `publicChat` flag is replaced by chat settings (migrated automatically, off)
- Admin API `PUT /api/admin/ai` accepts partial updates

## [1.4.2] — 2026-10-03 · Several AI providers, order & automatic fallback
### Added
- **Any number of OpenAI-compatible services** (OpenRouter, Groq, Together, DeepSeek, Mistral, Cerebras, Ollama, LM Studio, or any other) — "Add a service" with ready-made presets; each has its own name, base URL, key and models
- **Order & fallback**: separate ordered lists for writing and for covers/artwork (with SVG as an option); with **Automatic fallback** on, when a provider runs out of credit, is rate-limited, overloaded, has a wrong model or can't read a PDF, the next one is used automatically (safety blocks never switch)
- **Provider picker** in Fill with AI, ✨ AI text and ✨ Generate: "Auto" (the order) or one specific provider for that request; the result says which provider/model did it, and a note appears when a fallback happened
- **OpenRouter**: PDFs are read (free `cloudflare-ai` file parser) and images are made with its `/images` API (with aspect ratio); "Load models" also lists its image models; error objects sent with HTTP 200 are reported properly
- Usage log shows every attempt, including the failed ones that triggered a fallback
- 8 new tests (migration, OpenRouter PDF/images, fallback on/off, per-request pick, PDF skipping, raster → SVG)
### Changed
- Existing settings migrate automatically: the provider you chose stays first, the others follow, fallback is on
- Other compatible services fall back to `/images` when they don't have `/images/generations`

## [1.4.0] — 2026-10-02 · AI assistant
### Added
- **Admin → AI assistant**: connect Claude (Anthropic), Gemini (Google), OpenAI and any OpenAI-compatible endpoint with your own keys; any model name (current or future), **Load models** from your key, **Test** connection, choose providers for writing and images, style notes, 30-day usage (requests & tokens)
- **✨ Fill with AI** on every item, section-settings and site-settings form: notes / pasted text / PDF or image attachments (incl. files already on the form) → schema-constrained suggestions, re-validated with the form's rules, reviewed and ticked before applying
- **✨ AI** text tools on textarea/Markdown fields: write, improve, professional, shorten, expand, fix grammar, custom instruction
- **✨ Generate** on image fields: logos/icons as sanitised SVG → WebP (any provider); covers/square/portrait artwork via Gemini or OpenAI image models (SVG art fallback with Claude); saved to the media library; real-photo fields excluded
- Clear provider errors: exhausted key/credit ("Your … API key limit is exhausted"), bad key, unknown model, rate limit, outage, safety block — key never echoed
- Plain-fetch adapters (no SDKs): Anthropic Messages + structured outputs, Gemini generateContent (responseJsonSchema, image generation), OpenAI Responses + Images, chat-completions for compatible APIs; automatic fallback to plain JSON when a model lacks structured output
- Keys encrypted with AES-256-GCM (`AI_ENCRYPTION_KEY` or `AUTH_SECRET`), masked, excluded from backups; admin-only routes, CSRF, 300 req/h rate limit; usage log without prompts or keys
- `docs/AI-ASSISTANT.md`; 14 new tests (key encryption, schema & validation, SVG sanitising, error mapping, mocked adapters, end-to-end fill)
### Changed
- S3 storage signs requests with built-in crypto (removed the `aws4fetch` dependency) — v1.3.1
- Stage 3: custom domain, LinkedIn/Kaggle/LeetCode stats, real testimonials

## [1.3.0] — 2026-10-02 · Backup & Restore · deploy anywhere
### Added
- **Admin → Backups**: create full-site backups choosing what to include (all/some sections, settings, uploaded media, bundled site files, contact messages, activity log)
- Password-protected downloads (scrypt + AES-256-GCM, on by default); server copies always encrypted at rest (`BACKUP_SECRET` or `AUTH_SECRET`)
- **Restore** from an uploaded file or from history: checksum verification, preview of changes, scope (all / chosen sections, settings, media, messages), admin password + "RESTORE" confirmation, maintenance mode during restore, single DB transaction, automatic snapshot and **one-click Undo**
- Media and bundled files are re-uploaded to the new host's storage and content links rewritten (moving hosts just works)
- Chunked 4 MB uploads/downloads with short-lived signed tokens — fits serverless request/response limits
- **Scheduled backups** (daily/weekly/monthly, keep N): built-in timer on long-running servers, Vercel Cron (`vercel.json`), or `/api/cron/backup` with `CRON_SECRET` from any cron (GitHub Actions workflow included)
- `npm run backup` / `npm run restore` command-line tools; `content:apply` now also saves a snapshot to Admin → Backups
- **Deploy anywhere**: storage drivers for local disk (`DATA_DIR`), Vercel Blob and any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO); `output: "standalone"`; Dockerfile + docker-compose; first-start bootstrap (tables, demo content, admin from env) — no shell needed
- Deployment guide for Vercel, VPS, Hostinger, Docker, Render/Railway/Fly.io and serverless hosts
- Zip safety limits (entry count, size, compression ratio, allowed paths), newer-format refusal, cross-instance locks
- 11 new tests (encryption, tampering, path traversal, zip bombs, backup → change → restore → undo, partial restore, locks)
### Changed
- Database path follows `DATA_DIR`; runtime data is removed from build output (postbuild)
- Dashboard checklist: "Download your first full backup"

## [1.2.0] — 2026-10-02 · Personal content
### Added
- **Content file system**: `content/vinay.json` + `npm run content:check | content:apply | content:export` — validated against the section registry, checks every referenced file, automatic backup before applying, works with local SQLite and Turso
- Personal content: profile, 16 projects with case studies, 7 education entries, 37 skills, 3 experience entries, 13 certificates (images + PDFs), 5 achievements, 12 gallery items, 6 roadmap goals
- Media: cropped portraits (AI watermark removed), compressed hero video (MP4 + WebM + poster), certificate previews, generated project covers / achievement tiles / journey cards / share image (`scripts/art/generate-art.py`)
- Brand kit: 4 SVG logo options, new favicon, headline/tagline alternatives (`content/BRAND.md`)
- `content/UPDATE_REQUEST.md` fill‑in template for future updates
- Hero **background video** (Cinematic layout) with poster and reduced‑motion fallback
- Optional **logo mark** setting (replaces the initials badge)
- Counters support decimals (e.g. CGPA 8.5)
- `/me/…` accepted as a safe media path; 4 new unit tests for the importer
### Changed
- Testimonials and Writing are hidden until real content exists
- Removed the broken `db:seed` script

## [1.1.0] — 2026-10-02 · Switchable designs
### Added
- **43 section layouts** (3–4 per section) selectable per section from the admin:
  - Hero: 3D holo card · Terminal boot · Split parallax · Cinematic letterbox
  - About: Photo + story · Bento grid · Story chapters
  - Education: Glowing timeline · Level tracker · Minimal list
  - Skills: 3D sphere + bars · Logo marquee · Radar chart · Orbit planets
  - Projects: Featured grid · Netflix rows · Scroll stack · Bento showcase
  - Experience: Cards · Vertical timeline · Tabs by type
  - Certifications: Tilt cards · Badge wall · Coverflow carousel
  - Achievements: Film reel · Medal podium · Year timeline
  - Gallery: 3D ring · Masonry · Polaroid scatter · Film strip
  - Coming Soon: Trailer cards · Kanban board · Timeline bars
  - Testimonials: Marquee · Spotlight slider · Wall of love
  - Writing: Cards · Featured + list · Minimal list
  - Contact: Form + details · Big email · Contact cards
- Visual **layout picker** in the admin with real screenshots of each design.
- **Admin-only live preview** (`/?preview=section:layout`) — try a design on the real site before saving.
- Current design shown as a badge in Admin → Sections.
- Layout catalogue (`src/lib/layouts.ts`), server-side validation of layout values, 5 new unit tests.

### Changed
- Contact form extracted into a reusable `ContactForm` component shared by all contact layouts.
- Gallery's old "Layout" select merged into the new design picker (existing values keep working).

## [1.0.0] — 2026-10-02 · Stage 1: Foundation
### Added
- Cinematic public site with 13 switchable sections: Hero (draggable 3D photo card), About, Education,
  Skills (3D sphere), Projects (+ case-study pages), Experience, Certifications, Achievements (GSAP film reel),
  Gallery (3D ring), Coming Soon, Testimonials, Writing, Contact.
- Particle-galaxy background, cinematic preloader, glow cursor, film grain, Lenis smooth scrolling.
- Admin CMS: dashboard, sections manager, registry-driven entry editor, media library, messages inbox,
  site settings, account & security with activity log.
- Security: bcrypt, rate limiting & lockout, revocable JWT sessions, CSRF origin checks, nonce CSP,
  byte-level upload validation, safe Markdown.
- UX states: 404, 500, maintenance, offline, session expired, empty, no results.
- SEO metadata, JSON-LD, sitemap and robots; optional footer admin link.
- `npm run setup`, password reset script, unit tests, deployment guide and illustrated project guide (PDF).

### Fixed
- Hydration warning caused by browser extensions (e.g. Grammarly) adding attributes to `<body>`.
- Intro preloader could stay on screen in development (React Strict Mode) or in background tabs.
