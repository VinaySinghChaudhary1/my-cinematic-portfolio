# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [Unreleased]
- Stage 2: personal content (photos, bio, projects, certificates)

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
