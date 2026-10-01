# Portfolio — Master Plan

**Owner:** IIT Madras BS (Data Science & Applications) student · **Goal:** a long‑term, cinematic, 3D, fully self‑managed portfolio that grows from diploma level to graduation and beyond.

**Status:** ✅ Phase 1 built with demo data (this repo). ⏳ Phase 2 = fill in your real content. ⏳ Phase 3 = deploy.

---

## 1. Research summary — what modern portfolios include

Studied: your friends' repos ([Netflix_portfolio](https://github.com/Sushmitadasari/Netflix_portfolio) — React + Vite + GSAP + Framer Motion, Netflix preloader, custom cursor; [cinematic-portfolio](https://github.com/lohithadamisetti123/cinematic-portfolio) — React + TS + Tailwind + Lenis, video hero, scroll‑stack), your *Premium Portfolio Tech Stack* PDF (React, Tailwind, GSAP, 3D/360° hero, depth & micro‑interactions), your *Important checklist for app* PDF (production pages, UX states, security, accessibility), and award‑style 3D/scroll portfolios (Awwwards inspiration, Three.js portfolios).

**What both reference repos lack** (and this build adds): no backend, no login, no way to edit content without code, no uploads, no error states, no security layer. Their content is hard‑coded in components.

---

## 2. Architecture

```
Browser ──► Next.js 16 server (one app: website + admin + API)
             ├─ proxy.ts ............ per-request CSP nonce, /admin guard
             ├─ (site) pages ........ server-rendered from DB (SEO-friendly)
             ├─ /admin pages ........ CMS (server-checked session)
             ├─ /api/* .............. JSON API (Zod-validated, CSRF-checked, rate-limited)
             └─ /media/* ............ safe file serving for uploads
                    │
        Drizzle ORM ┼──► libSQL: SQLite file (local) | Turso (cloud)
                    └──► Files:  data/uploads (disk) | Vercel Blob (cloud)
```

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 + React 19 + TypeScript** | SSR for SEO/LinkedIn previews, API routes in the same app, deploys anywhere |
| Styling | **Tailwind CSS 4** + design tokens | Fast, consistent, accent colours editable from admin |
| 3D | **Three.js + React Three Fiber + drei** | Interactive 3D portrait card, galaxy particles |
| Motion | **GSAP ScrollTrigger**, **Framer Motion**, **Lenis** | Cinematic pinning/scrubbing, reveals, smooth scroll |
| Data | **Drizzle + libSQL** | Same code for local SQLite and cloud Turso — zero setup locally |
| Auth | **bcrypt + signed JWT in httpOnly cookie (jose)** | No external auth provider needed; revocable |
| Validation | **Zod**, generated from one *section registry* | Admin forms, API validation and rendering share one definition |

**Key idea — the Section Registry** (`src/lib/registry.ts`): each section type declares its fields once. The admin form builder, server validation and public renderer all read it. Adding a new field (e.g. “GPA” on Education) = one line.

---

## 3. Sections (each can be switched on/off, reordered, renamed, hidden from menu)

| # | Section | Public experience | You control |
|---|---|---|---|
| 0 | **Hero** | Name reveal, typing roles, **draggable 3D photo card** (front + back photo), orbit rings, galaxy | Greeting, roles, buttons, 3D on/off, portrait photos |
| 1 | **About** | Tilt photo, bio, quick facts, animated counters, interests | Bio (Markdown), photos, facts, stats |
| 2 | **Education** | Scroll‑drawn glowing timeline; Completed / **Ongoing** / **Upcoming** badges | Institution, degree, status, dates, grade, courses, logo |
| 3 | **Skills** | Interactive **3D skill sphere** + category tabs with proficiency bars | Skill, category, level, icon, years |
| 4 | **Projects** | Featured layout, category filter, **search** (with no‑results state), show‑more, **case‑study page per project** with gallery, video & prev/next | Everything incl. status *Completed / In progress / Planned (future)* |
| 5 | **Experience** | Internships, clubs, volunteering, leadership cards | Role, org, type, dates, description, skills |
| 6 | **Certifications** | Tilt cards, issuer filter, full‑screen viewer, PDF + verify link | Upload image and/or PDF, credential ID & URL |
| 7 | **Achievements** | **Cinematic horizontal film‑reel** pinned on scroll (desktop) | Title, org, date, category, image |
| 8 | **Gallery** | **Draggable 3D ring carousel** or masonry + lightbox with keyboard nav | Photos, captions, albums |
| 9 | **Coming Soon / Roadmap** | Upcoming education, future projects, goals with progress bars | Type, target date, status, progress |
| 10 | **Testimonials** | Auto‑scrolling marquee (pauses on hover) | Real, permitted quotes only |
| 11 | **Writing / Blog** | Article cards linking to Medium/LinkedIn etc. | Title, excerpt, URL, cover, tags |
| 12 | **Contact** | Secure form → admin inbox, email, socials, availability badge | Heading, text, form on/off |
| — | Global | Cinematic preloader, galaxy background, glow cursor, film grain, résumé download, SEO + JSON‑LD, sitemap, robots | All effects toggleable; accent colours |

Hidden items stay saved but are not public; sections with no visible items hide themselves automatically.

---

## 4. UX & design system

- **Look:** dark sci‑fi neon — deep space `#05040b`, violet `#8b5cf6` + cyan `#22d3ee` (editable), glass cards, gradient text, Space Grotesk (display) / Inter (text) / JetBrains Mono (labels).
- **Motion rules:** one big moment per section; everything eases with `cubic-bezier(.16,1,.3,1)`; **reduced‑motion users get a calm static version** automatically; 3D pauses when the tab is hidden; galaxy dims after the hero for readability.
- **Performance:** 3D is lazy‑loaded (no SSR), fewer particles on mobile, capped pixel ratio, lazy images, client‑side image compression on upload, self‑hosted fonts.
- **Responsive:** tested at 390 px (phone) and 1440 px (desktop); mobile menu; horizontal reel becomes a swipe row on phones.
- **Accessibility:** skip link, semantic landmarks & headings, labelled controls, visible focus rings, keyboard‑operable dialogs (Esc, focus return), `aria-live` announcements, non‑colour error indicators, alt text field for every upload. (No formal WCAG audit claimed.)

---

## 5. Admin panel (`/admin`)

Dashboard (stats + launch checklist + latest messages) · Sections & content (on/off, menu, order, edit) · Section editor (settings + entries: add/edit/hide/feature/reorder/delete with confirmation, unsaved‑changes guard, live preview links) · Media library (drag‑drop, multi‑upload with progress, filters, search, alt text, copy link) · Messages (unread filter, reply via email) · Site settings (Profile, Socials, Appearance & effects, SEO, Footer, Maintenance, Privacy) · Account (password with strength meter, sign out everywhere, activity log).

---

## 6. Security design

| Threat | Defence (where) |
|---|---|
| Password guessing | bcrypt(12); per‑IP and per‑email rate limits; account lock after 8 failures (`lib/server/auth.ts`, `rate-limit.ts`) |
| Account enumeration | Identical error + constant‑time dummy hash for unknown emails |
| Session theft / fixation | httpOnly, SameSite=Lax, Secure (on HTTPS) cookie; 7‑day expiry; `sessionVersion` revokes all sessions on password change / “sign out everywhere” |
| Bypassing the UI | Every admin API calls `requireAdmin()` server‑side (proxy guard is only the first layer) |
| CSRF | Origin/Referer must match Host on every mutating request (`lib/server/http.ts`) |
| XSS | React escaping; Markdown rendered with **raw HTML disabled** + URL protocol allow‑list; strict **nonce‑based CSP**; JSON‑LD escaped |
| Malicious links | `javascript:`, `data:`, `//evil` blocked in all URL fields (`isSafeUrl`) |
| Malicious uploads | Type detected from **file bytes** (not extension); SVG/HTML refused; size limits; random file names; served with `nosniff` + sandbox CSP; path‑traversal guard |
| Open redirect after login | `safeAdminReturnPath()` only allows `/admin…` |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options` |
| Spam on contact form | Honeypot field, minimum fill time, 5 messages/hour/IP |
| Info leaks | Generic 500 messages with a reference ID; stack traces only in server logs; no secrets in client bundles |
| Secrets | `.env.local` git‑ignored; production refuses to start without a strong `AUTH_SECRET` |

---

## 7. Error handling & UX states

404 (custom “This scene doesn't exist”), 500 / unexpected (`error.tsx` with retry + reference), global failure (`global-error.tsx`), **maintenance mode** (from DB setting; owner still sees site), **offline banner**, **session expired** (redirect to login with a safe return path + message), loading spinners/skeletons, empty states with next actions, no‑search‑results with reset, success confirmations, form errors that **keep what you typed**, optimistic toggles that roll back on failure.

---

## 8. Roadmap (future‑ready)

- **Phase 2 (next):** your real content, photos & certificates; privacy notice; launch.
- **Phase 3 ideas:** blog posts written in the admin (Markdown pages), GitHub/LeetCode live stats, view analytics (privacy‑friendly), email notifications for new messages (Resend), two‑factor login (TOTP), image cropping, multiple languages, light theme, theme presets (Netflix‑red, gold film), 3D avatar from a GLB model, automatic backups.

---

## 9. 📋 What I need from you for the real version

Send these whenever you're ready (from LinkedIn / résumé is fine). Anything you skip stays hidden.

**Basics**
1. Full name (as you want it shown) + initials for the logo
2. Headline (e.g. “BS Data Science · IIT Madras”) and a one‑line tagline
3. Public email, city/country (optional), LinkedIn, GitHub, other profiles (LeetCode, Kaggle, Instagram…)
4. Résumé PDF
5. Roles for the typing animation (3–5)

**Photos**
6. 2 portrait photos for the 3D card (front + back), **vertical 4:5**, good light, ≥ 1200 px tall
7. 1 photo for About; optional extra photos for the gallery (events, hackathons, campus)

**Content**
8. Bio (3–6 sentences: who you are, what you love, what you're looking for)
9. Education: each level — institution, programme, dates, status (completed/ongoing/upcoming), grade, key courses
10. Skills: list + rough level (beginner/intermediate/advanced) + category
11. Projects: title, 1‑line summary, what you did, tech used, links (GitHub/live/video), screenshots, status
12. Experience / clubs / volunteering
13. Certificates: title, issuer, date, credential ID/URL + the image or PDF
14. Achievements / awards with dates
15. Future plans: upcoming courses, project ideas, goals
16. Testimonials (only real ones with permission)

**Decisions**
17. Domain name (e.g. `yourname.dev`) or use the free `*.vercel.app`
18. Keep demo testimonials/blog sections hidden until you have real ones? (recommended)
19. Privacy notice details: contact email for privacy requests and how long to keep messages

> ⚖️ The privacy notice is a template you must complete; have it reviewed if you're unsure. This plan doesn't claim legal compliance (GDPR/DPDP etc.).
