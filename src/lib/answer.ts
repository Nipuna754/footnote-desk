/*
  Answers one question for one workspace, using only that workspace's passages.
  Returns the same Answer shape the chat already renders.
*/
import { adminClient } from "@/lib/supabase/admin";
import { ai, type Passage, type Turn } from "@/lib/ai";
import type { Answer, AnswerPart, Citation } from "@/content/demo";

const TOP_K = 6;
// Below this similarity the best passage is off-topic, so we don't even ask the model.
// ponytail: one fixed threshold, tune per workspace if real documents need it
const MIN_SIMILARITY = Number(process.env.MIN_SIMILARITY ?? 0.55);

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export async function answerQuestion(
  workspace: { id: string; name: string },
  question: string,
  history: Turn[] = [],
): Promise<Answer> {
  const db = adminClient();
  // A follow-up like "what about the second one?" only makes sense with the
  // questions before it, so search with those included.
  const searchText = [...history.slice(-2).map((t) => t.question), question].join("\n");
  const [queryVector] = await ai().embed([searchText], "query");

  const { data: matches, error } = await db.rpc("match_chunks", {
    p_workspace: workspace.id,
    p_embedding: JSON.stringify(queryVector),
    p_count: TOP_K,
  });
  if (error) throw new Error(error.message);

  const relevant = (matches ?? []).filter((m: { similarity: number }) => m.similarity >= MIN_SIMILARITY);
  if (relevant.length === 0) return { kind: "not-covered" };

  const passages: Passage[] = relevant.map(
    (m: { file_name: string; page: number; content: string }, i: number) => ({
      n: i + 1,
      file: m.file_name,
      page: m.page,
      content: m.content,
    }),
  );

  const draft = await ai().answer(question, passages, workspace.name, history);
  return toAnswer(draft, passages);
}

/**
 * Numbers sources 1, 2, 3 in reading order, one number per file and page
 * (several passages from the same page share it), and drops unsupported sentences.
 */
export function toAnswer(
  draft: { answered: boolean; sentences: { text: string; sources: number[]; quote: string }[] },
  passages: Passage[],
): Answer {
  if (!draft.answered) return { kind: "not-covered" };

  const byN = new Map(passages.map((p) => [p.n, p]));
  const pageKey = (p: Passage) => `${p.file}#${p.page}`;
  const citations: Citation[] = [];
  const citationFor = new Map<string, Citation>();
  const parts: AnswerPart[] = [];

  for (const s of draft.sentences ?? []) {
    const sources = (s.sources ?? []).filter((n) => byN.has(n));
    if (!s.text?.trim() || sources.length === 0) continue; // no source, no sentence

    if (parts.length) parts.push(" ");
    parts.push(s.text.trim());

    const quote = squash(s.quote ?? "");
    const cited = new Set<number>();
    for (const n of sources) {
      const p = byN.get(n)!;
      let c = citationFor.get(pageKey(p));
      if (!c) {
        c = { n: citations.length + 1, file: p.file, page: p.page, quote: "", context: "" };
        citationFor.set(pageKey(p), c);
        citations.push(c);
      }
      const text = squash(p.content);
      if (!c.context.includes(text)) c.context = c.context ? `${c.context} \u2026 ${text}` : text;
      // Only highlight a quote that really is in the source, word for word.
      if (!c.quote && quote && c.context.includes(quote)) c.quote = quote;
      if (!cited.has(c.n)) {
        cited.add(c.n);
        parts.push({ cite: c.n });
      }
    }
  }

  return citations.length ? { kind: "answered", parts, citations } : { kind: "not-covered" };
}
