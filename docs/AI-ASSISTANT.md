# AI assistant — user guide

The admin panel can use **your own** Claude, Gemini or OpenAI key, and **any number** of OpenAI-compatible services (OpenRouter, Groq, Together, DeepSeek, Mistral, Cerebras, Ollama, LM Studio…), to do the following:

| Where | Button | What it does |
|---|---|---|
| Any item form (education, project, certificate, experience, skill, achievement, roadmap, gallery…) | **✨ Fill with AI** (top right of the form) | Turns your rough notes, pasted text, a certificate PDF or a screenshot into correctly formatted field values. You tick which suggestions to keep. |
| Section settings and Site settings (profile, SEO, footer, privacy) | **✨ Fill with AI** | Same, for those forms. |
| Long text fields (descriptions, bios, case studies, summaries) | **✨ AI** next to the field | Offers: Write it for me · Improve · More professional · Shorter · Longer · Fix grammar · or your own instruction. |
| Image fields (logos, covers, achievement images, gallery artwork, SEO share image) | **✨ Generate** | Logos and icons are drawn as clean vector art (any provider). Covers and artwork come from an image model, or are drawn as vector art (SVG). Results are saved to the media library, in the folder "ai". |

Nothing is saved until you press **Save** on the form. Real photos (avatar, portraits) are never generated.

## Set up (2 minutes)

1. Get a key: [Claude](https://console.anthropic.com/settings/keys) · [Gemini](https://aistudio.google.com/apikey) · [OpenAI](https://platform.openai.com/api-keys) · [OpenRouter](https://openrouter.ai/keys) · [Groq](https://console.groq.com/keys) · …
2. Go to **Admin → AI assistant**.
   - For Claude, Gemini or OpenAI: paste the key into its card → **Save** → **Test**.
   - For any other service: **Add a service** → choose a preset (or "Other service") → key + writing model → **Add** → **Test** on its new card.
3. Optional: **Load models** shows every model your key can use. You can type any model name, so new models work the day they're released.
4. Under **Order & fallback**, set the order providers are tried in, then press **Save order**.

## How the site chooses a provider

There are two ordered lists:

- **Writing, filling forms, reading files.** These providers are also used to draw logos, icons and SVG art.
- **Covers & artwork.** These are image models. **Vector drawing (SVG)** is also an entry; it means "draw it with the writing providers", which is free and never photo-like.

Every request starts with **#1** in the list.

With **Automatic fallback** on (the default), the next provider is tried when one fails. That covers these cases:

| Failure | Example |
|---|---|
| Limit exhausted / no credit | "Your Gemini API key limit is exhausted…" |
| Rate-limited, overloaded or down | 429, 503 |
| Wrong model name or key | 404, 401 |
| Can't read the attached PDF | Groq, Ollama… are skipped for PDFs |
| Empty or broken answer | The model returned no text |

A **safety block** never switches provider.

When a fallback happens, you see a short note such as *"Gemini didn't work (limit exhausted…) — OpenRouter did it instead."* The dialog also shows which provider and model did the job.

With fallback **off**, only #1 is used. The other providers are still available in the dialogs.

**Per request:** every AI dialog has an **AI provider** menu. **Auto** follows the order; picking one provider uses only that one, with no fallback. The choice is remembered until you reload the page.

**Example (free setup):**

| Writing | Covers & artwork |
|---|---|
| 1. Gemini `gemini-3.5-flash-lite` | 1. Gemini `gemini-3.1-flash-image` (needs Google billing) |
| 2. OpenRouter `openrouter/free` | 2. Vector drawing (SVG) |
| 3. Groq `llama-…` | |

If Gemini's free quota runs out, OpenRouter writes instead. If the image model has no credit, covers are drawn as SVG instead of failing.

## What each provider can do

| Provider | Writing | Reads PDFs | Reads images | Makes images |
|---|---|---|---|---|
| Claude | ✅ | ✅ | ✅ | — (SVG only) |
| Gemini | ✅ | ✅ | ✅ | ✅ with an image model (paid tier) |
| OpenAI | ✅ | ✅ | ✅ | ✅ with an image model |
| OpenRouter | ✅ (free models available) | ✅ free parser | depends on the model | ✅ with a paid image model (see **Load models**) |
| Groq, Cerebras, DeepSeek, Mistral… | ✅ | — | depends on the model | — mostly |
| Ollama / LM Studio (same computer) | ✅ free | — | vision models only | — |

## Checking that everything works

Use a hidden test project. Press **Discard** so nothing is kept.

1. **Writing:** Fill with AI → a few rough notes → *Fill the form*. You should get a tick-list. The dialog says which provider was used.
2. **PDF reading:** Fill with AI → attach a certificate PDF under 3 MB → no notes. Fields should contain facts only found in the PDF.
3. **Photo reading:** attach a JPG or PNG screenshot instead.
4. **Text tools:** ✨ AI beside a description → Improve.
5. **Logo:** a logo field → Generate → Logo.
6. **Cover:** a cover field → Generate → Cover. Try each entry in the **AI provider** menu.
7. **Fallback:** put a provider you know is out of quota at #1 → run any of the above. A "did it instead" note should appear.

Then check **Media → "ai" folder** (every generated image) and **AI assistant → Usage**. Usage lists every attempt with its provider, task (`fill`, `text`, `image`, `image-svg`, `test`), model and result, including the failed attempts that caused a fallback.

## When your key runs out

There's no spending cap inside the site. When a provider's limit is exhausted, you see its message, for example:

> *"Your OpenAI API key limit is exhausted — You exceeded your current quota… Add credit / upgrade your plan, wait for the limit to reset, or switch to another provider in Admin → AI."*

With fallback on, the next provider takes over. If every provider fails, the message lists each one and its reason.

## Security

- **Keys:**
  - Encrypted (AES-256-GCM) before they're stored.
  - Shown only as `••••last4`.
  - Never sent to the browser, never logged, and **never included in backups**.
  - The optional `AI_ENCRYPTION_KEY` env variable sets the encryption key; otherwise `AUTH_SECRET` is used, and changing it means re-entering your keys.
- **Requests:** every AI request runs on the server, behind the admin login, CSRF checks and a rate limit of 300 requests per hour.
- **Base URLs:** OpenAI-compatible base URLs must use `https://`. The only exception is `http://localhost`, for Ollama and LM Studio on the same machine.
- **Answers:**
  - The AI can only answer in the shape of the form.
  - Every value is re-checked with the same rules as manual input (dates, https links, options, lengths).
  - Text in your notes or files is treated as data, not instructions.
- **SVG:** generated SVG is cleaned (no scripts, links or external content) and converted to a WebP image before it's stored.
- **What is sent:** only what you type or attach is sent to the provider. Your messages, database and keys never are.

## Bulk import and "Ask about me" chat (v1.5)

- **Admin → Bulk import:** a résumé (PDF, photo or pasted text) is read by your providers in the usual order. The result is a review list across Experience, Education, Projects, Skills, Certifications and Achievements. Usage task: `import`.
- **"Ask about me" chat:** set it up at the bottom of this page. It's off by default; you can turn it on for beta testers and yourself first. It answers only from published content and never stores conversations. Usage task: `chat`.

Full guide: [`EMAIL-AND-ACCESS.md`](EMAIL-AND-ACCESS.md) (sections 6 and 7).
