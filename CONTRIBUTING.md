# Contributing

Thanks for your interest in improving this portfolio!

1. Fork the repo and create a branch: `git checkout -b feat/my-change`
2. Install and set up: `npm install && npm run setup`
3. Make your change and keep the existing design system (tokens in `src/app/globals.css`).
4. Run the checks: `npm run lint && npm run typecheck && npm test && npm run build`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: add hackathons section`)
6. Open a pull request describing what changed and why, with screenshots for UI changes.

**Adding a section?** Define it in `src/lib/registry.ts`, add a component in
`src/components/site/sections/`, register it in `SectionRenderer.tsx`, and add demo data in `src/db/seed-data.ts`.

Never commit `.env.local`, databases (`data/*.db`) or uploads (`data/uploads/`).
