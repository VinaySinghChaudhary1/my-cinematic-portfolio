# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [Unreleased]
- Stage 2: personal content (photos, bio, projects, certificates)

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
