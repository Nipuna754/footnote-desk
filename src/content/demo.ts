/*
  Shared answer types, plus the fictional Aerin Home demo settings.
  The real documents live in demo-docs/ and are loaded by /api/dev/seed.
*/

export type Citation = {
  n: number;
  file: string;
  page: number;
  /** Exact words from the passage to highlight; empty if none could be matched. */
  quote: string;
  /** The passage the answer came from. */
  context: string;
};

/** An answer is text with citation markers placed between the pieces. */
export type AnswerPart = string | { cite: number };

export type Answer =
  | { kind: "answered"; parts: AnswerPart[]; citations: Citation[] }
  | { kind: "not-covered" };

export const company = {
  name: "Aerin Home",
  slug: "aerin-home",
  product: "Aerin P3 air purifier",
};

export const documents = [
  "aerin-p3-user-manual.pdf",
  "warranty-and-returns.pdf",
  "filter-subscription-faq.pdf",
];

export const suggestions = [
  "Can I wash the filter?",
  "Is it quiet enough for a bedroom?",
  "What does the warranty cover?",
  "Do you ship to Canada?",
];

/*
  The first answer is shown on page load without calling the AI, so every
  visitor doesn't spend a free-tier request. It uses the same passages the
  live search returns for this question.
*/
export const openingQuestion = "How often should I replace the filter?";

const manualFilters =
  "Looking after the filters The P3 uses two filters: a washable pre-filter that catches hair and dust, and a sealed HEPA filter that catches fine particles. Replace the HEPA filter every 6 to 8 months. The filter light turns amber when about two weeks of life remain. After fitting a new filter, hold the filter button for 5 seconds to reset the light. Do not wash the HEPA filter; water damages the fibres. The pre-filter can be vacuumed or rinsed every two weeks and must be fully dry before refitting.";

const subscription =
  "AERIN HOME - FILTER SUBSCRIPTION FAQ How the subscription works A filter subscription ships a replacement HEPA filter every 6 months for $39, with free shipping. You can skip a delivery or cancel any time from your account page before the next ship date. Changing your address Update your shipping address on your account page at least 3 days before the next ship date.";

export const openingAnswer: Answer = {
  kind: "answered",
  parts: [
    "Replace the HEPA filter every 6 to 8 months.",
    { cite: 1 },
    " The filter light turns amber when about two weeks of life are left, so you don't need to track the date.",
    { cite: 1 },
    " If you'd rather not think about it, the filter subscription sends a new one every 6 months for $39.",
    { cite: 2 },
  ],
  citations: [
    {
      n: 1,
      file: "aerin-p3-user-manual.pdf",
      page: 4,
      quote: "Replace the HEPA filter every 6 to 8 months. The filter light turns amber when about two weeks of life remain.",
      context: manualFilters,
    },
    {
      n: 2,
      file: "filter-subscription-faq.pdf",
      page: 1,
      quote: "A filter subscription ships a replacement HEPA filter every 6 months for $39, with free shipping.",
      context: subscription,
    },
  ],
};
