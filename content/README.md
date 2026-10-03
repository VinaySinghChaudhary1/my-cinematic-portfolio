# Content files — update the whole site from one JSON file

Everything visitors see (profile, socials, every section, every item and the chosen design of each section) can live in **one JSON file**. `content/vinay.json` is the live content of this portfolio.

You can still edit everything in the admin panel (`/admin`). The content file is just a faster, reviewable way to make many changes at once — and it's what Claude updates when you send an update request.

> **Two ways to edit — pick one per change.** `content:apply` *replaces* all sections and items with what's in the file. If you edited something in the admin panel, run `npm run content:export` first and copy those changes into the file, or they'll be overwritten. A backup is saved automatically every time you apply.

---

## Commands

| Command | What it does |
|---|---|
| `npm run content:check` | Validates `content/vinay.json` and checks every `/me/...` file exists. Changes nothing. |
| `npm run content:apply` | Backs up the current content to `content/backups/`, then replaces sections, items and the settings groups in the file. |
| `npm run content:apply -- content/other.json` | Apply a different file. |
| `npm run content:export` | Saves the current database content (including admin-panel edits) to `content/backups/export-<time>.json`. |

Applying never touches admin accounts, passwords, uploaded media, contact messages or the audit log.

### Local vs. live site

The command writes to whichever database `.env.local` points to:

- **Local** (default): `DATABASE_URL=file:./data/portfolio.db`
- **Live site on Vercel + Turso**: temporarily put the Turso `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in `.env.local`, run `npm run content:apply`, then switch back. Text changes appear immediately.

**New images or files** go in `public/me/...` and must be committed + pushed (Vercel redeploys automatically). If you run `npm start` locally, run `npm run build` again so it can serve new files (`npm run dev` picks them up instantly).

---

## File structure

```jsonc
{
  "settings": {
    "profile":  { "name", "initials", "logo", "headline", "tagline", "email", "location", "avatar", "resume" },
    "socials":  { "github", "linkedin", "x", "instagram", "youtube", "leetcode", "kaggle", "medium", "website" },
    "seo":      { "title", "description", "keywords": [], "ogImage", "indexable" },
    "footer":   { "text", "showBuiltWith", "showAdminLink" }
    // also allowed: "appearance", "maintenance", "privacy" (same fields as Admin → Settings)
  },
  "sections": [
    {
      "key": "projects",            // unique id, used for #anchors (lowercase, dashes)
      "type": "projects",           // hero | about | education | skills | projects | experience | certifications
                                    // | achievements | gallery | roadmap | testimonials | blog | contact
      "title": "Projects",
      "subtitle": "Selected work",
      "enabled": true,              // false = hidden from visitors (still editable in admin)
      "config": { "layout": "rows", ... },   // section settings, incl. the design (see list below)
      "items": [ { "featured": true, "title": "...", ... } ]   // order here = order on the site
    }
  ]
}
```

Order of `sections` = order on the page. Any item can carry `"featured": true` (highlighted) or `"visible": false` (hidden).

### Designs (`config.layout`)

| Section | Designs |
|---|---|
| hero | `classic` (3D card) · `terminal` · `split` · `cinematic` (video/photo backdrop) |
| about | `classic` · `bento` · `chapters` |
| education | `classic` · `ladder` · `list` |
| skills | `classic` · `marquee` · `radar` · `orbit` |
| projects | `classic` · `rows` · `stack` · `bento` |
| experience | `classic` · `timeline` · `tabs` |
| certifications | `classic` · `badges` · `carousel` |
| achievements | `classic` · `podium` · `timeline` |
| gallery | `ring` · `masonry` · `polaroid` · `filmstrip` |
| roadmap | `classic` · `kanban` · `gantt` |
| testimonials | `classic` · `spotlight` · `wall` |
| blog | `classic` · `featured` · `list` |
| contact | `classic` · `minimal` · `cards` |

### Item fields per section

| Section | Fields (★ = required) |
|---|---|
| about (stats) | ★`label`, ★`value` (number, decimals OK), `suffix` |
| education | ★`institution`, ★`degree`, `field`, ★`status` (`completed`/`ongoing`/`upcoming`), `startDate`, `endDate`, `grade`, `location`, `logo`, `description` (Markdown), `courses` [ ], `link` |
| skills | ★`name`, ★`category`, `level` (0–100), `icon` (emoji/short text), `years` |
| projects | ★`title`, `slug`, ★`summary`, ★`status` (`completed`/`in-progress`/`planned`), `category`, `cover`, `gallery` [ ], `description` (Markdown case study), `tech` [ ], `role`, `startDate`, `endDate`, `repoUrl`, `liveUrl`, `videoUrl` |
| experience | ★`role`, ★`organization`, `kind` (`internship`/`job`/`freelance`/`club`/`volunteer`/`leadership`), `startDate`, `endDate` (empty = current), `location`, `logo`, `description` (Markdown), `skills` [ ], `link` |
| certifications | ★`title`, ★`issuer`, `issueDate`, `expiryDate`, `credentialId`, `credentialUrl`, `image`, `file` (PDF), `skills` [ ] |
| achievements | ★`title`, `organization`, `date`, `category`, `description`, `image`, `link` |
| gallery | ★`image`, `caption`, `album`, `date` |
| roadmap | ★`title`, `kind` (`education`/`project`/`skill`/`career`/`personal`), `targetDate`, `status` (`planned`/`in-progress`/`done`), `progress` (0–100), `description` |
| testimonials | ★`name`, `role`, ★`quote`, `avatar`, `link` — **only real quotes, with the person's permission** |
| blog | ★`title`, `excerpt`, `url`, `date`, `cover`, `tags` [ ] |

**Formats:** dates are `YYYY-MM` or `YYYY-MM-DD`. Links must be `https://…`. Images/files are `/me/...` (bundled in `public/me/`), `/media/...` (uploaded in admin) or `https://…`.

### Where personal files live

```
public/me/
  brand/        logo-1-monogram.svg (active), logo-2…4 (alternatives), og.png (share image)
  photos/       portrait-front/back, about-*, avatar
  video/        hero.mp4 (+ .webm, poster)
  gallery/      me-*.webp (photos), art-*.webp (generated journey cards)
  projects/     <slug>.webp covers (generated by scripts/art/generate-art.py)
  certs/        <name>.webp preview + <name>.pdf original
  achievements/ generated tiles
  logos/        organisation monogram badges
  docs/         résumé PDF
```

Regenerate the illustrated project covers / achievement tiles / journey cards / share image after changing projects:
`python3 scripts/art/generate-art.py` (needs Python + `pip install playwright pillow` + `npm install` for fonts).

---

## Asking Claude to update the site

Fill in [`UPDATE_REQUEST.md`](./UPDATE_REQUEST.md), put any new files in a folder next to it, and send it. Claude edits `vinay.json`, prepares images, runs `content:check`, applies it and updates the docs.
