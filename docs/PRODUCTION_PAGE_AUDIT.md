# Production page audit

Audited against *Important checklist for app*. Application type: **single‑owner personal portfolio with an admin CMS** — public visitors have no accounts, there are no payments, subscriptions, physical products or user‑generated public content. Only the owner logs in. Personal data collected from visitors: **name, email, optional subject and message via the contact form**, plus IP addresses used transiently for rate‑limiting.

Statuses: `EXISTS_AND_ADEQUATE` · `EXISTS_NEEDS_IMPROVEMENT` · `APPLICABLE_MISSING` · `NOT_APPLICABLE` · `BLOCKED_BY_MISSING_INFORMATION`

## Legal

| Page | Status | Evidence | Reason | Action |
|---|---|---|---|---|
| Privacy Policy | BLOCKED_BY_MISSING_INFORMATION | `src/app/(site)/privacy/page.tsx`; Admin → Settings → Privacy (`settings-def.ts`); `api/contact/route.ts` stores name/email/message | Contact form collects personal data | Page + editor + starter outline built. Returns 404 until the owner writes real content and publishes; publishing is blocked while `[PLACEHOLDERS]` remain. Needs owner name, contact, host/DB provider, retention period. **Legal review recommended.** |
| Terms of Service | NOT_APPLICABLE | No visitor accounts, transactions or UGC | — | — |
| Cookie Policy | NOT_APPLICABLE (covered in privacy outline) | Only cookie: `pf_session` (admin login, httpOnly). `sessionStorage` key `pf_intro` (intro shown). No analytics/ads | — | Mentioned in privacy outline |
| Cookie Preferences | NOT_APPLICABLE | No non‑essential cookies or trackers | — | Re‑evaluate if analytics are added |
| Refund / Cancellation / Shipping / Return | NOT_APPLICABLE | No payments or products | — | — |
| Disclaimer | NOT_APPLICABLE | Portfolio info only | — | — |
| Accessibility Statement | NOT_APPLICABLE (optional) | Public site; no formal audit performed | No compliance claimed | Can add after an audit |
| DPA / AUP / Community Guidelines | NOT_APPLICABLE | No business customers, no public UGC | — | — |
| Security Policy / Responsible Disclosure | NOT_APPLICABLE (small personal site) | — | Owner may add `security.txt` later | — |

## Customer lifecycle

| Page | Status | Evidence | Notes |
|---|---|---|---|
| Login | EXISTS_AND_ADEQUATE | `app/admin/login/page.tsx`, `components/admin/LoginForm.tsx`, `api/auth/login/route.ts` | Rate‑limited, lockout, no enumeration, safe `next` redirect, session‑expired message |
| Register | NOT_APPLICABLE | Single owner; admin created by `npm run setup` | Prevents strangers creating admin accounts |
| Email verification | NOT_APPLICABLE | No email provider; no self‑registration | — |
| Forgot / Reset password | EXISTS_AND_ADEQUATE (offline) | `scripts/reset-password.ts`; explained on login & account pages | No email service → offline reset by server owner; invalidates all sessions. No fake “email me a link” UI |
| Onboarding | EXISTS_AND_ADEQUATE | Dashboard launch checklist (`admin/(panel)/page.tsx`) | — |
| Account settings | EXISTS_AND_ADEQUATE | `admin/(panel)/account`, `api/admin/account/*` | Change password, sign out everywhere, activity log |
| Account deletion | NOT_APPLICABLE | Owner controls the deployment/DB | — |
| Billing / Upgrade / Downgrade / Payments | NOT_APPLICABLE | No payments | — |
| Support / Help center | EXISTS_AND_ADEQUATE | Contact section + admin inbox; README & docs for the owner | — |

## UX states

| State | Status | Evidence |
|---|---|---|
| 404 | EXISTS_AND_ADEQUATE | `app/not-found.tsx`; unknown project slugs & unpublished privacy return real 404 status |
| 403 | EXISTS_AND_ADEQUATE | CSRF / closed contact form return JSON 403 with message (`lib/server/http.ts`); single role so no separate 403 page needed |
| 500 | EXISTS_AND_ADEQUATE | `app/error.tsx` (retry + digest), `app/global-error.tsx`, API errors return reference ID only |
| Maintenance | EXISTS_AND_ADEQUATE | DB setting `maintenance.enabled` → `components/site/Maintenance.tsx`; owner bypass + banner |
| Offline | EXISTS_AND_ADEQUATE | `components/site/OfflineBanner.tsx`; contact & admin errors detect offline, form data kept |
| Empty | EXISTS_AND_ADEQUATE | `components/ui/States.tsx` used in projects, media, messages, entries |
| No search results | EXISTS_AND_ADEQUATE | Projects, media, entries: query preserved + reset button |
| Loading | EXISTS_AND_ADEQUATE | Spinners with `role=status`, skeleton for 3D, upload progress |
| Error | EXISTS_AND_ADEQUATE | `ErrorState` with retry; field‑level validation messages |
| Success | EXISTS_AND_ADEQUATE | Contact success state; toasts naming the exact change |
| Session expired | EXISTS_AND_ADEQUATE | proxy + panel layout redirect to `/admin/login?reason=expired&next=…`; API 401 → client redirect; cookie cleared |

## Verification results

| Check | Command / method | Result |
|---|---|---|
| Type check | `npm run typecheck` | PASSED |
| Lint | `npm run lint` | PASSED (0 problems) |
| Unit tests | `npm test` (20 tests: URL safety, open redirect, validation, uploads, path traversal, JWT tampering, helpers) | PASSED |
| Production build | `npm run build` | PASSED |
| Route availability / 404 | curl against `next start` | PASSED |
| Protected routes | unauthenticated `/admin/*` → 307 login; `/api/admin/*` → 401 | PASSED |
| CSRF | POST without / with foreign Origin → 403 | PASSED |
| Login rate limit | 7th wrong attempt → 429 | PASSED |
| Session revocation | “sign out everywhere” → old cookie rejected (API 401, page redirect `reason=expired`) | PASSED |
| Upload validation | SVG renamed `.png` → 415; real PNG → 201; traversal → 400/404 | PASSED |
| Maintenance mode | visitor sees maintenance; admin sees site + banner | PASSED |
| Browser (desktop 1440 & mobile 390) | Playwright screenshots of every section & admin page; no console/CSP errors in production build | PASSED |
| Accessibility tooling (axe) | — | NOT_RUN (no axe tooling installed) |
| Real hosting (Vercel/Turso/Blob) | — | NOT_RUN (needs owner accounts) |

## Missing owner information

Legal name to display · privacy contact email · hosting & DB providers chosen · message retention period · domain / `SITE_URL` · real content and photos.

## Remaining risks

- Privacy notice requires owner details and ideally a legal review before launch.
- Vercel deployments must use Turso + Vercel Blob (documented); local SQLite/disk would lose data there.
- Password recovery is offline‑only (no email provider configured).
- No formal WCAG audit; 3D/animation effects are skipped for reduced‑motion users but have not been tested with screen‑reader users.
