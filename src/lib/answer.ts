/*
  Answers one question for one workspace, using only that workspace's passages.
  Returns the same Answer shape the chat already renders.
*/
import { adminClient } from "@/lib/supabase/admin";
import { ai, type Passage } from "@/lib/ai";
import type { Answer, AnswerPart, Citation } from "@/content/demo";

const TOP_K = 6;
// Below this similarity the best passage is off-topic, so we don't even ask the model.
// ponytail: one fixed threshold, tune per workspace if real documents need it
const MIN_SIMILARITY = Number(process.env.MIN_SIMILARITY ?? 0.55);

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export async function answerQuestion(
  workspace: { id: string; name: string },
  question: string,
): Promise<Answer> {
  const db = adminClient();
  const [queryVector] = await ai().embed([question], "query");

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

  const draft = await ai().answer(question, passages, workspace.name);
  return toAnswer(draft, passages);
}

/** Renumbers cited passages 1, 2, 3 in reading order and drops anything unsupported. */
export function toAnswer(
  draft: { answered: boolean; sentences: { text: string; sources: number[]; quote: string }[] },
  passages: Passage[],
): Answer {
  if (!draft.answered) return { kind: "not-covered" };

  const byN = new Map(passages.map((p) => [p.n, p]));
  const citations: Citation[] = [];
  const numberFor = new Map<number, number>();
  const parts: AnswerPart[] = [];

  for (const s of draft.sentences ?? []) {
    const sources = (s.sources ?? []).filter((n) => byN.has(n));
    if (!s.text?.trim() || sources.length === 0) continue; // no source, no sentence

    if (parts.length) parts.push(" ");
    parts.push(s.text.trim());
    for (const n of sources) {
      if (!numberFor.has(n)) {
        const p = byN.get(n)!;
        const quote = squash(s.quote ?? "");
        const context = squash(p.content);
        numberFor.set(n, citations.length + 1);
        citations.push({
          n: citations.length + 1,
          file: p.file,
          page: p.page,
          // Only highlight a quote that really is in the passage, word for word.
          quote: quote && context.includes(quote) ? quote : "",
          context,
        });
      }
      parts.push({ cite: numberFor.get(n)! });
    }
  }

  return citations.length ? { kind: "answered", parts, citations } : { kind: "not-covered" };
}
