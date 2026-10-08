import type { Citation } from "@/content/demo";
import styles from "./SourcePanel.module.css";

/** Shows the cited passage with the quoted words highlighted. */
export function SourcePanel({ citation }: { citation: Citation | null }) {
  if (!citation) {
    return (
      <div className={styles.empty}>
        <p>Select a numbered source to see the exact passage the answer came from.</p>
      </div>
    );
  }

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.caption}>
        <span className={styles.badge}>Source {citation.n}</span>
        <span className="mono">{citation.file}</span>
      </figcaption>
      <article className={styles.page} aria-label={`${citation.file}, page ${citation.page}`}>
        <p className={styles.para}>
          <Highlighted
            text={citation.context}
            quote={citation.quote}
            id={`${citation.file}${citation.page}${citation.n}${citation.quote}`}
          />
        </p>
        <p className={styles.folio}>Page {citation.page}</p>
      </article>
    </figure>
  );
}

function Highlighted({ text, quote, id }: { text: string; quote: string; id: string }) {
  const at = quote ? text.indexOf(quote) : -1;
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      {/* key restarts the highlighter sweep for each new citation */}
      <mark key={id} className={styles.mark}>
        {quote}
      </mark>
      {text.slice(at + quote.length)}
    </>
  );
}
