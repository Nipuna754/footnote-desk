"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Answer, Citation } from "@/content/demo";
import { SourcePanel } from "@/components/SourcePanel/SourcePanel";
import styles from "./Chat.module.css";

type Failed = { kind: "error"; message: string };
type Turn = { id: number; question: string; answer: Answer | Failed | null };
type Active = { turn: number; n: number } | null;

const WIDE = "(min-width: 64rem)";

type ChatProps = {
  company: { name: string; slug: string };
  documents: string[];
  suggestions?: string[];
  /** A pre-recorded first exchange, so the page shows an answer without an AI call. */
  opening?: { question: string; answer: Answer };
};

export function Chat({ company, documents, suggestions = [], opening }: ChatProps) {
  const [turns, setTurns] = useState<Turn[]>(
    opening ? [{ id: 0, question: opening.question, answer: opening.answer }] : [],
  );
  const [active, setActive] = useState<Active>(opening ? { turn: 0, n: 1 } : null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.answer === null);
  const docCount = documents.length === 1 ? "1 document" : `${documents.length} documents`;

  const activeCitation = findCitation(turns, active);

  useEffect(() => {
    if (turns.length > 1) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const id = turns.length;
    setTurns((t) => [...t, { id, question: q, answer: null }]);
    setDraft("");
    setStatus(`Searching ${docCount}`);

    let answer: Answer | Failed;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: company.slug, question: q, history: recentTurns(turns) }),
      });
      const data = await res.json();
      answer = res.ok ? data.answer : { kind: "error", message: data.error };
    } catch {
      answer = { kind: "error", message: "Couldn't reach Footnote Desk. Check your connection and try again." };
    }

    setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer } : turn)));
    if (answer.kind === "answered") {
      const n = answer.citations.length;
      setStatus(`Answer ready, with ${n} ${n === 1 ? "source" : "sources"}`);
      if (window.matchMedia(WIDE).matches) setActive({ turn: id, n: 1 });
    } else if (answer.kind === "not-covered") {
      setStatus(`Not found in ${company.name}'s documents`);
    } else {
      setStatus(answer.message);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ask(draft);
  }

  function openCitation(turn: number, n: number) {
    setActive({ turn, n });
    if (!window.matchMedia(WIDE).matches) dialogRef.current?.showModal();
  }

  return (
    <div className={styles.layout}>
      <section className={styles.chat} aria-labelledby="chat-title">
        <header className={styles.chatHead}>
          <h2 id="chat-title" className={styles.chatTitle}>
            {company.name} help
          </h2>
          <p className={styles.scope}>
            Answers only from {docCount}
            {documents.length > 0 ? ": " : "."}
            {documents.map((d, i) => (
              <span key={d}>
                <span className="mono">{d}</span>
                {i < documents.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </header>

        {turns.length === 0 && (
          <p className={styles.empty}>
            {documents.length
              ? `Ask a question and the answer will come from ${company.name}’s documents, with sources.`
              : `${company.name} hasn’t added any documents yet, so there’s nothing to answer from.`}
          </p>
        )}
        <ol className={styles.thread} hidden={turns.length === 0}>
          {turns.map((t) => (
            <li key={t.id} className={styles.turn}>
              <p className={styles.question}>
                <span className="visually-hidden">You asked: </span>
                {t.question}
              </p>
              {t.answer === null ? (
                <p className={styles.thinking}>
                  Searching {docCount}
                  <span className={styles.dots} aria-hidden="true" />
                </p>
              ) : t.answer.kind === "answered" ? (
                <AnswerBlock
                  turn={t.id}
                  answer={t.answer}
                  active={active}
                  onCite={openCitation}
                />
              ) : t.answer.kind === "error" ? (
                <p className={styles.failed}>{t.answer.message}</p>
              ) : (
                <div className={styles.notCovered}>
                  <p className={styles.notCoveredTitle}>
                    Not in {company.name}&rsquo;s documents
                  </p>
                  <p>
                    None of the documents answer this, so I won&rsquo;t
                    guess. Your question has been passed to the {company.name} team so
                    they can add the answer.
                  </p>
                </div>
              )}
            </li>
          ))}
        </ol>
        <div ref={endRef} />

        <div className={styles.composer}>
          {suggestions.length > 0 && (
          <ul className={styles.suggestions} aria-label="Example questions">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className={styles.suggestion}
                  onClick={() => ask(s)}
                  disabled={busy}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
          )}
          <form className={styles.form} onSubmit={onSubmit}>
            <label htmlFor="question" className="visually-hidden">
              Ask {company.name} a question
            </label>
            <input
              id="question"
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Ask ${company.name} a question`}
              autoComplete="off"
              maxLength={300}
            />
            <button type="submit" className={styles.send} disabled={busy || !draft.trim()}>
              Ask
            </button>
          </form>
        </div>
        <p className="visually-hidden" role="status">
          {status}
        </p>
      </section>

      <aside className={styles.panel} aria-label="Source">
        <SourcePanel citation={activeCitation} />
      </aside>

      <dialog
        ref={dialogRef}
        className={styles.sheet}
        aria-label="Source"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <form method="dialog" className={styles.sheetBar}>
          <button className={styles.close}>Close</button>
        </form>
        <SourcePanel citation={activeCitation} />
      </dialog>
    </div>
  );
}

function AnswerBlock({
  turn,
  answer,
  active,
  onCite,
}: {
  turn: number;
  answer: Extract<Answer, { kind: "answered" }>;
  active: Active;
  onCite: (turn: number, n: number) => void;
}) {
  const isActive = (n: number) => active?.turn === turn && active.n === n;
  const label = (c: Citation) => `Source ${c.n}: ${c.file}, page ${c.page}`;
  const byN = (n: number) => answer.citations.find((c) => c.n === n)!;

  return (
    <div className={styles.answer}>
      <p className={styles.answerText}>
        {answer.parts.map((p, i) =>
          typeof p === "string" ? (
            <span key={i}>{p}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={styles.marker}
              data-active={isActive(p.cite) || undefined}
              aria-label={label(byN(p.cite))}
              onClick={() => onCite(turn, p.cite)}
            >
              {p.cite}
            </button>
          ),
        )}
      </p>
      <ul className={styles.sources} aria-label="Sources">
        {answer.citations.map((c) => (
          <li key={c.n}>
            <button
              type="button"
              className={styles.source}
              data-active={isActive(c.n) || undefined}
              onClick={() => onCite(turn, c.n)}
            >
              <span className={styles.sourceN}>{c.n}</span>
              <span className="mono">{c.file}</span>
              <span className={styles.sourcePage}>p. {c.page}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The last few finished exchanges as plain text, so the server understands follow-ups. */
function recentTurns(turns: Turn[]) {
  return turns
    .filter((t) => t.answer && t.answer.kind !== "error")
    .slice(-3)
    .map((t) => ({
      question: t.question,
      answer:
        t.answer!.kind === "answered"
          ? t.answer!.parts.filter((p): p is string => typeof p === "string").join("")
          : "(The documents didn't cover this.)",
    }));
}

function findCitation(turns: Turn[], active: Active): Citation | null {
  if (!active) return null;
  const a = turns.find((t) => t.id === active.turn)?.answer;
  return a?.kind === "answered" ? (a.citations.find((c) => c.n === active.n) ?? null) : null;
}
