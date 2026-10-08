# PLAN.md: App 2, AI support chatbot with citations ("Footnote Desk", formerly Citebox)

## What it is
An owner signs in and uploads PDFs and docs. Visitors ask questions and get answers built only from those documents, with numbered citations (file + page). If the documents don't cover a question, the bot says so instead of guessing. The owner dashboard lists the unanswered questions.

Demo content is fictional: **Aerin Home**, a made-up company selling the Aerin P3 air purifier, with three sample documents (user manual, warranty and returns, filter subscription FAQ).

## Decisions (Step 1)
- Name: Footnote Desk (renamed from Citebox on 2026-10-08: citebox.app already exists)
- AI: Google Gemini API free tier, one key for answers and embeddings, behind one provider setting so a paid provider can be swapped in later. Rate limiting, with a friendly "busy, try again" message.
- Payments: Lemon Squeezy test mode only (Free vs Pro). Changed from Stripe on 2026-10-08: Stripe doesn't accept Sri Lankan accounts; Lemon Squeezy does. Check the webhook signature before any plan change.
- Stack: Next.js → Supabase (pgvector, Storage, Auth, row-level security) → GitHub (Nipuna754) → Vercel
- Its own look: not Fieldnote (dark green, editorial) and not Haven Lane (light blue, navy, coral, centred hero)

## Steps
| Step | This app |
|---|---|
| 1. Plan | Done |
| 2. Front end | Chat page, citation panel, owner dashboard, pricing page, all with sample data, on localhost:3000 |
| 3. Back end | Supabase tables + pgvector, upload to Storage, text extraction per page, chunking, Gemini embeddings, search, answer with citations, rate limit |
| 4. Log-in | Supabase Auth, owner-only dashboard, row-level security on every table |
| 5. Payments | Lemon Squeezy checkout in test mode, webhook with signature check, Free vs Pro limits |
| 6. Go live | GitHub + Vercel, keys only in Vercel environment variables |
| 7. Case study | Problem / Solution / Tech / Result, demo video, screenshots |

## Design (Step 2)
- **Idea:** "answers with receipts." Every claim points to a page you can see.
- **Signature:** the source panel. Clicking a citation opens a facsimile of the cited page (file name, page number) and a highlighter sweeps across the exact passage.
- **Colour:** paper `#F7F7F9`, ink `#1E1A24`, plum `#5A2A82` (primary), highlighter `#FBE55A` (fill only, dark text), rule `#DEDAE3`, error `#B42318`. All text pairs checked against WCAG AA by `scripts/contrast.py`.
- **Type:** Schibsted Grotesk (interface), Source Serif 4 (answers and document pages, like reading a manual), IBM Plex Mono (file names and page numbers).
- **Layout:** the home page is the working demo itself: conversation on the left, source panel on the right. On phones the source panel opens as a sheet.

## Done when (Step 2)
- All four views work with sample data at 360 / 768 / 1280 px
- axe: 0 violations; Lighthouse accessibility 90 or higher; keyboard-only walkthrough works; reduced motion respected

## Progress
- [x] Step 1: Plan
- [x] Step 2: Front end. Chat with sample answers, citation panel (side panel on wide screens, sheet on phones), "not in the documents" answer, owner dashboard (unanswered questions, documents, upload box with file checks), pricing (Free / Pro). Contrast script 18/18. axe: 0 violations on all 3 pages. Keyboard-only walkthrough works with visible focus. No sideways scroll at 375px. Lighthouse mobile: performance 95-97, accessibility 100, best practices 100, SEO 100 (/dashboard is noindex on purpose, so SEO 60 there). Desktop: 100 across the board except dashboard SEO. Layout shift 0.
- [x] Step 3: Back end. Supabase tables + pgvector search + private Storage bucket (supabase/migrations), row-level security on every table (anonymous read, search and insert checked: all blocked). PDF/TXT/MD → text per page → passages → Gemini embeddings (768 dims). Answers from Gemini (`gemini-flash-lite-latest`; `gemini-2.5-flash` is closed to new keys) with structured JSON, every sentence must cite a passage, quotes checked word for word before highlighting. Off-topic, prompt-injection and "not in the documents" questions all return "not covered". Rate limits: 5 a minute and 40 a day per visitor (hashed IP), monthly plan limit per workspace; Gemini 429/503 → "busy, try again". Provider behind AI_PROVIDER. Demo seeded from demo-docs/ via POST /api/dev/seed (development only). Smoke test: scripts/check-api.sh. Node 20 needs --experimental-websocket for Supabase (added to npm scripts; Vercel's Node has it built in).
- [x] Step 4: Log-in. Email + password sign-up and sign-in (Supabase Auth; "Confirm email" off because Supabase's built-in mailer only sends to team members; minimum password 8). A database trigger gives each new owner their own workspace and public help page (/c/<slug>). Proxy refreshes sessions and sends signed-out visitors from /dashboard to /signin. Dashboard shows real documents, unanswered questions (grouped, "Mark handled"), monthly usage. Upload goes straight from the browser into the owner's own Storage folder, then /api/documents checks the plan limit and indexes it; Delete removes the row and the file. Isolation test (scripts/check-isolation.mjs): 14/14 pass, including another owner reading, uploading, deleting or editing, and an owner upgrading their own plan. Browser walkthrough: sign-up → upload → ask on the help page (answer cites p. 2; uncovered question logged) → mark handled → delete → sign out → dashboard redirects. axe 0 on every page. Lighthouse mobile 97/100/100, SEO 100 on public pages (sign-in and help pages are noindex on purpose). No sideways scroll at 375px.
- [x] Step 5: Payments (Lemon Squeezy, test mode). "Upgrade to Pro" creates a test-mode checkout tied to the workspace (checked: opens the hosted checkout, $19 every month, "Test mode is currently enabled"). "Manage billing" opens Lemon Squeezy's customer portal. The plan changes only in the webhook, after an HMAC-SHA256 signature check (constant-time compare), and only for our store, our Pro product and test-mode events. Owners can't edit plan or billing columns (database grants). scripts/check-webhook.mjs: 13/13 pass (no/forged/wrong-secret signature rejected, other store/product/live mode ignored, active → Pro, cancelled keeps Pro until period end, expired/unpaid → Free, past due keeps Pro). Isolation test still 14/14. Real webhook delivery is connected in Step 6, once the app has a public URL.
- [ ] Step 6: Go live (GitHub repo footnote-desk, Vercel, env vars, Lemon Squeezy webhook → https://<app>/api/billing/webhook with the signing secret, Supabase Auth URL settings)
