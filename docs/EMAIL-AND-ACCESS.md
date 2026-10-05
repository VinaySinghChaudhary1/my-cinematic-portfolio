# Email, Google sign-in & beta testers — setup guide (v1.5)

Everything here is **optional**. Until you add a setting, its feature switches itself off: emails are skipped and logged, and the Google button is hidden. The rest of the site keeps working.

| Feature | Needs | Where |
|---|---|---|
| Forgot-password emails, invite emails, new-message alerts | `RESEND_API_KEY` (+ optional `EMAIL_FROM`) | Vercel → Settings → Environment Variables |
| "Continue with Google" for you and your testers | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vercel → Settings → Environment Variables |
| Beta testers, maintenance preview, drafts & scheduling, bulk import, "Ask about me" chat | nothing extra | Admin panel |

`SITE_URL` must be your real address (e.g. `https://vinaysinghchaudhary.me`). Links in emails and the Google redirect use it.

After adding or changing env variables in Vercel, **redeploy** (Deployments → ⋯ → Redeploy), because Vercel only reads them at build/start time.

---

## 1. Email with Resend (free: 3,000 emails/month, 100/day)

1. Sign up at **resend.com** → **Domains → Add domain** → enter your domain (e.g. `vinaysinghchaudhary.me`), region closest to you.
2. Resend shows 3–4 DNS records (a TXT for SPF on `send`, a TXT for DKIM `resend._domainkey`, an MX on `send`, and optionally DMARC). Add each one at your DNS host:
   - **Namecheap** → Domain List → Manage → **Advanced DNS** → *Add new record*. In the Host field, enter only the part **before** your domain (`send`, `resend._domainkey`).
   - These records don't touch your website's `A` / `CNAME` records or any existing email.
3. Back in Resend, press **Verify**. It usually takes minutes, but can take up to a few hours.
4. **API Keys → Create API key** → permission *Sending access* → copy it once.
5. In **Vercel → Settings → Environment Variables**, add:
   - `RESEND_API_KEY` = the key (type it yourself; never paste it into chats or commits)
   - optional `EMAIL_FROM` = `Your Name <noreply@yourdomain>`. The default is `<your name> <noreply@<domain of SITE_URL>>`.
6. Redeploy. Then go to **Admin → Account & security → Email**, press **Send test email**, and check your inbox and spam folder.

**What gets emailed**

- **Password reset links**, for you and for testers. They're valid for 30 minutes and work once. The page always says "if an account exists…", so nobody can probe which emails are registered.
- **"Your password was changed"** notice after every reset.
- **Tester invites**, when you tick *Email the invite*.
- **New contact-form message** alerts, and **beta feedback** alerts. Configure them in **Admin → Site settings → Notifications**: choose the address, and whether to include the message text. Reply-To is set to the sender, so you can answer straight from your mail app.

**Troubleshooting**

- *"The email service refused the message: … domain is not verified"*: finish step 3, or make `EMAIL_FROM` use the verified domain.
- *Nothing arrives*: open Resend → **Logs**. Every send and bounce is listed there.

---

## 2. Google sign-in (free, no Google review needed)

The app only asks for `openid email profile`, which Google treats as non-sensitive, so no verification process is required.

1. Go to **console.cloud.google.com** → create a project (e.g. "Portfolio").
2. **APIs & Services → OAuth consent screen** (also called *Google Auth Platform → Branding*):
   - User type **External**.
   - App name, support email, and your domain under *Authorized domains*.
   - Audience: **In production**. In *Testing* mode only listed test users can sign in, and sessions expire after 7 days.
3. **Clients → Create client** → **Web application**:
   - *Authorized JavaScript origins*: `https://yourdomain`
   - *Authorized redirect URIs*: `https://yourdomain/api/auth/google/callback`
   - For local testing, also add `http://localhost:3000` and `http://localhost:3000/api/auth/google/callback`.
4. Copy the **Client ID** and **Client secret** into Vercel as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then redeploy.
5. **Link your admin account:** **Admin → Account & security → Google sign-in → Link Google account**.
   - Only a linked Google account can open the admin panel. A matching email address alone is **never** enough.
   - You can unlink at any time; your password keeps working.
6. **Testers** can press *Continue with Google* on `/beta`. It works when the Google email equals the email you saved for them. The first time, their Google account is linked to that tester.

**Security details:**

- Authorization-code flow with PKCE, state and nonce.
- The ID token signature, issuer, audience and `email_verified` are checked against Google's keys.
- The temporary OAuth cookie lives 10 minutes and only on `/api/auth/google`.

---

## 3. Beta testers & maintenance preview

**Admin → Beta testers → Add a tester**

1. Fill in the tester's details:
   - **Name.**
   - **Email** (optional): used for the invite, for password reset and for Google sign-in.
   - **WhatsApp number** (optional): use the country code. A 10-digit Indian number gets +91 automatically.
   - **Access ends:** 7, 14 or 30 days, a date, or no expiry.
   - **Can see drafts.**
   - **Note** (optional).
2. Press **Create**. A strong password (e.g. `Kp7m-Qx3r-W9tz`) is shown **once** with three buttons:
   - **Copy message**
   - **Send on WhatsApp**: opens WhatsApp with the invite typed in. You press send yourself.
   - Email (sent automatically if ticked)

The site never stores the password itself, only a bcrypt hash. Forgot it? Use **New password**.

**What testers get**

- They sign in at **`/beta`**. During maintenance, the maintenance page also links there.
- They see the full site **even while Maintenance mode is on**, plus any section you switched to **Beta** in Sections & content ("Beta testers only" badge).
- With *Can see drafts*, they can also show **draft and scheduled** entries using the bar at the top.
- **Send feedback** from that bar. It arrives in **Messages** as "[Beta feedback] …" and, if enabled, by email.
- Testers can **never** open `/admin`. They use a separate cookie (`pf_beta`) with its own token audience.

**Controlling access**

- **Revoke** signs the tester out immediately.
- **Restore** lets them in again.
- **+7 days** extends an expired tester.
- **Delete** removes them. Their feedback messages stay in Messages.
- **Lock-out:** after 8 wrong passwords, a tester login is blocked for 15 minutes. Logins are also rate-limited per IP.

**Typical beta flow**

1. Turn on **Site settings → Maintenance mode**. Visitors now see the maintenance page.
2. Build the new section or entries. Mark sections **Beta** or entries **Draft** as needed.
3. Invite testers and collect feedback in Messages.
4. When ready, switch sections back to public, publish the entries, and turn maintenance off.

---

## 4. Drafts & scheduled publishing

Every entry form has **Publishing: Published · Draft · Scheduled** next to *Visible*.

- **Draft:** hidden from visitors. You see it with *Show drafts* in the top bar on the site, and so do testers who are allowed to see drafts.
- **Scheduled:** pick a date and time. The entry goes live by itself at that moment, with no cron job needed, because the site checks the time on every request.
- The entry list shows **Draft** / **Scheduled · date** badges.
- Backups and `content/*.json` files keep these settings:
  - `"draft": true` and `"publishAt": "2026-11-01T09:00"` on items.
  - `"audience": "beta"` on sections.
- Hidden entries (the eye icon) stay hidden whatever their publishing state.

---

## 5. Installable app (PWA) & offline

- Visitors can **install** the site from Chrome/Edge (install icon in the address bar) or Safari (Share → Add to Home Screen). It opens full-screen with your icon and name.
- **Offline:** pages and images people have opened keep working without a connection. Anything else shows a friendly "You're offline" page.
- Never cached: the admin panel, `/api`, `/beta`, `/auth`, and any page viewed while signed in (admin, tester or preview). Personal views never end up on a shared device's offline cache.
- The service worker is only registered in production (`npm run build && npm start`, or Vercel). It updates itself on the next visit after a deploy.

---

## 6. Bulk import (Admin → Bulk import)

- **Résumé (AI):** attach a PDF or photo, and/or paste text.
  - The AI reads it with your providers (same order and fallback as everywhere).
  - It returns entries for Experience, Education, Projects, Skills, Certifications and Achievements. Only sections that exist on your site are filled.
- **LinkedIn export:** LinkedIn → Settings → Data privacy → **Get a copy of your data** → upload the ZIP.
  - Only `Positions`, `Education`, `Skills`, `Certifications`, `Projects` and `Honors` CSVs are read, **in your browser**. Messages and connections never leave your computer.
  - No AI is needed for this path.
- **Review** before anything is added:
  - Possible duplicates and entries that need fixing start unticked.
  - The pencil opens the full form for that entry.
- **Add:** entries are added as **Drafts** by default, or published immediately if you choose.
  - A **"Before bulk import"** backup is taken first, so **Backups → Restore** undoes the whole import.
  - If any ticked entry is still invalid, nothing is added and the problems are shown.

---

## 7. "Ask about me" chat (Admin → AI assistant)

**Modes**

- **Off:** the default.
- **Beta testers & me:** only signed-in testers and you see the button.
- **Everyone.**

**What it knows and shares**

- Answers come **only** from what is published on your site, plus the optional *extra facts* you write.
- Drafts, hidden entries, settings, messages and keys are never included.
- It refuses unrelated tasks and won't reveal its rules.

**Limits and cost**

- *Questions per visitor per hour* (default 12) and *per day for the whole site* (default 200) protect your API quota. You are never limited.
- Choose a free model (Gemini Flash-Lite, OpenRouter free) as the chat provider to keep it at no cost.

**Privacy**

- Conversations are not stored. Only token counts appear in **AI assistant → Usage** (task `chat`).
- If every provider fails, visitors see a polite message; the details are only in your usage log.
