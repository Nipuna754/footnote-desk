# Footnote Desk: case study

Live: https://footnote-desk.vercel.app
Code: https://github.com/Nipuna754/footnote-desk

---

## Upwork portfolio entry (copy and paste)

**Title**
Footnote Desk: AI support chatbot that cites its sources

**Your role**
Designer and full-stack developer (solo)

**Project description** (under 600 characters)
An AI support chatbot that answers customer questions only from a company's own PDFs and documents. Every answer cites the file and page, and selecting a citation highlights the exact passage. If the documents don't cover a question, the bot says so instead of guessing, and the question appears on the owner's dashboard. Includes sign-up, document upload, Free/Pro plans with Lemon Squeezy checkout, and row-level security tested so one company can never see another's data.

**Skills** (pick up to 5 that Upwork offers)
AI Chatbot · AI App Development · Next.js · Supabase · Web Development

**Project URL**
https://footnote-desk.vercel.app

**Images, in this order**
1. `01-answer-with-source.png`: An answer with numbered citations; the source panel highlights the exact passage.
2. `02-not-in-the-documents.png`: When the documents don't cover a question, it says so instead of guessing.
3. `04-owner-dashboard.png`: Owner dashboard: unanswered questions to fix, documents, and plan usage.
4. `03-phone-source-sheet.png`: On phones, citations open as a sheet with the quoted passage.
5. `05-pricing.png`: Free and Pro plans, billed through Lemon Squeezy (test mode).

---

## Problem

Support chatbots that "know" a company's documents often invent answers. A customer can't tell a real policy from a confident guess, and the company only finds out when a customer complains. Owners also can't see which questions their documents fail to answer.

## Solution

Footnote Desk answers only from the documents a company uploads, and proves every answer:

- **Citations on every sentence.** Each claim links to a file and page. Selecting the number opens the passage with the quoted words highlighted.
- **Follow-up questions.** It remembers the last few turns, so "how much does that cost?" or "why didn't you mention X?" work, and every fact still needs a source.
- **Honest "I don't know".** If no passage is relevant, the bot says the documents don't cover it. Outside knowledge and instructions hidden in questions are refused.
- **A to-do list for the owner.** Unanswered questions are grouped and counted on the dashboard, so the owner knows exactly which document to write next.
- **Self-serve setup.** Owners sign up, get their own help page, drag in PDFs, TXT or Markdown, and can ask about them within seconds.

## How it works

1. Files are uploaded straight from the browser into the owner's private storage folder.
2. The server reads the text page by page, cuts it into passages and creates embeddings.
3. A question is matched against that company's passages only (vector search in Postgres).
4. The best passages (plus the last few turns, for follow-ups) go to the AI model with strict rules: answer only from them, list the passage for each sentence, copy an exact quote. The server then drops any sentence without a source and only highlights quotes that appear word for word.

## Tech

Next.js 16 (App Router, TypeScript) · hand-written CSS with design tokens · Supabase (Postgres, pgvector, Auth, Storage, row-level security) · Google Gemini API (answers and embeddings, behind one provider setting, with automatic fallback to a faster model when the main one is busy) · Lemon Squeezy (subscriptions, signed webhooks) · Vercel

## Result

Measured on the live site:

- **Accessibility:** Lighthouse accessibility 100 on every public page; axe 0 violations; full keyboard use; screen readers are told when an answer arrives.
- **Speed:** Lighthouse performance 92–100 on phones; layout shift 0.
- **Answer behaviour (tested):** answers in-scope questions and follow-ups with correct file and page, usually in about 4 to 5 seconds; returns "not in the documents" for out-of-scope questions, general-knowledge questions and prompt-injection attempts (including ones planted in the conversation history).
- **Data isolation:** 14 automated checks prove one owner can't read, upload, delete or edit another owner's data, and can't upgrade their own plan.
- **Billing safety:** 13 automated checks prove the plan only changes for genuine, signed payment events from the right store and product.
- **Cost control:** per-visitor rate limits (hashed IP, never stored raw), monthly limits per plan, and a friendly "busy, try again" message when the free AI tier is overloaded.

No real customers yet: this is a portfolio build with a fictional demo company.

---

## Demo video script (about 60 seconds)

Record with QuickTime (File → New Screen Recording) at 1440×900. Silent with captions, or read the lines aloud.

| Time | On screen | Say or caption |
|---|---|---|
| 0–8s | Home page, scroll slightly | "Footnote Desk answers support questions only from a company's own documents." |
| 8–20s | Click source 1, then source 2 | "Every answer cites the file and page, and highlights the exact passage." |
| 20–30s | Type "Do you ship to Canada?" and Ask | "If the documents don't cover it, it says so instead of guessing." |
| 30–42s | Dashboard: unanswered questions, then the documents list | "The owner sees what customers asked that the documents couldn't answer." |
| 42–52s | Drag a PDF into "Add a document"; it turns Ready | "Upload a PDF and it's searchable in seconds." |
| 52–60s | Pricing page, then Upgrade to Pro (test checkout) | "Free and Pro plans, with secure checkout. Built with Next.js, Supabase and Gemini." |

---

## What to claim, and what not to

Claim: Next.js, TypeScript, Supabase (Postgres, pgvector, Auth, Storage, row-level security), Gemini API, retrieval with citations, Lemon Squeezy subscriptions and signed webhooks, Vercel, WCAG AA.

Don't claim from this project: Stripe, OpenAI, LangChain, Python, vector databases other than pgvector, or real paying customers.
