# Brand kit — Vinay Singh Chaudhary

## Logo options

All four are in `public/me/brand/`. The active one is set in `content/vinay.json → settings.profile.logo` (also Admin → Settings → Profile → Logo mark). The browser-tab icon is `src/app/icon.svg`.

| # | File | Idea | Best for |
|---|---|---|---|
| 1 ✅ active | `logo-1-monogram.svg` | **V·S·C monogram** — gradient V, white S, cyan c inside a neon frame | Navbar, favicon, résumé header |
| 2 | `logo-2-datanode.svg` | **Data-node V** — the V is drawn as a small graph of connected nodes (data science / ML) | Data-science-first branding, LinkedIn banner |
| 3 | `logo-3-code.svg` | **Code V** — `< V >` brackets with a blinking-cursor underline (developer) | GitHub, dev-focused pages |
| 4 | `logo-4-orbit.svg` | **Orbit badge** — "VSC" with an orbit ring, matching the 3D/space theme | Stickers, avatar, social profile pictures |

To switch: change `"logo": "/me/brand/logo-2-datanode.svg"` (and copy the same SVG over `src/app/icon.svg` for the favicon).

## Headline & tagline

**Active (from your GitHub + résumé):**
- **Headline:** Data Science & Full-Stack Developer · IIT Madras
- **Tagline:** I turn raw data into decisions and ideas into shipped products — from ML models and Fabric pipelines to LLM agents and full-stack apps.

**Alternatives** (swap in `settings.profile.headline` / `tagline`):

| # | Headline | Tagline |
|---|---|---|
| 1 | Data Scientist in the making · IIT Madras BS | Building ML models, data pipelines and LLM agents that solve real problems. |
| 2 | Microsoft Certified Fabric Analytics Engineer · IIT Madras | From lakehouse to dashboard to deployed model — I make data useful end-to-end. |
| 3 | ML · Data Engineering · Full-Stack | Python-first builder who ships: Kaggle models, Flask + Vue apps and autonomous AI agents. |
| 4 | IIT Madras Data Science · Diploma ×2 · DP-600 | Curious about data, obsessed with shipping — and always learning in public. |
| 5 | Turning data into decisions | Data science student at IIT Madras crafting analytics, ML and AI-powered products. |
| 6 | Python & ML Builder · Automation Developer | I automate the boring, model the uncertain and build the apps that tie it together. |

## Colours & type

- Accent `#8b5cf6` (violet) → `#22d3ee` (cyan), background `#07061a`
- Display: Space Grotesk · Body: Inter · Code: JetBrains Mono
