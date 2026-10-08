# Footnote Desk

A customer support bot that answers only from a company's own documents and shows its sources. Every answer cites the file and page, and selecting a citation highlights the exact passage. When the documents don't cover a question, it says so instead of guessing, and the question appears on the owner's dashboard.

Portfolio project. The demo company (Aerin Home) and its documents are fictional.

## What it does

- **Visitors** ask questions on a public help page and get answers with numbered citations.
- **Owners** sign up, upload PDF, TXT or Markdown files, see unanswered questions, and upgrade to Pro.
- **Pro plan** through a Lemon Squeezy checkout (test mode only; no real card is charged).

## How it works

1. Uploaded files go to private storage in the owner's own folder.
2. Text is read page by page, cut into passages and turned into embeddings (Gemini).
3. A question is embedded and matched against that workspace's passages (pgvector).
4. The best passages go to Gemini with strict instructions: answer only from them, cite each sentence, copy an exact quote. Quotes are checked word for word before they're highlighted; uncited sentences are dropped.

## Security

- Row-level security on every table; an isolation test proves one owner can't read or change another's data (`scripts/check-isolation.mjs`).
- The plan changes only in the payment webhook, after an HMAC signature check (`scripts/check-webhook.mjs`).
- Rate limits per visitor (hashed IP) and per workspace; secret keys only in environment variables.

## Tech

Next.js 16 (App Router, TypeScript), hand-written CSS with design tokens, Supabase (Postgres, pgvector, Auth, Storage), Google Gemini API, Lemon Squeezy, Vercel.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

Run the SQL files in `supabase/migrations/` in order in the Supabase SQL Editor, then load the demo with `curl -X POST http://localhost:3000/api/dev/seed`.
