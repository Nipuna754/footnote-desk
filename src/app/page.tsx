import Link from "next/link";
import { Chat } from "@/components/Chat/Chat";
import { company, documents, openingAnswer, openingQuestion, suggestions } from "@/content/demo";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main id="main" className={`container ${styles.main}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>
          A support bot that <span className={styles.receipt}>shows its sources</span>
        </h1>
        <p className={styles.lede}>
          Footnote Desk answers customer questions only from the documents you upload, points to
          the exact page, and tells you when your documents don&rsquo;t have the answer.
        </p>
        <p className={styles.demoNote}>
          Try it below. Aerin Home is a made-up company with three sample documents. Select
          a number in an answer to see the passage it came from.{" "}
          <Link href="/signup">Make one for your own documents</Link>.
        </p>
      </div>
      <Chat
        company={company}
        documents={documents}
        suggestions={suggestions}
        opening={{ question: openingQuestion, answer: openingAnswer }}
      />

      <section className={styles.how} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.howTitle}>
          How it works
        </h2>
        <ol className={styles.howSteps}>
          <li>
            <h3>Upload your documents</h3>
            <p>Manuals, policies, FAQs or price lists, as PDF, TXT or Markdown. Each one is ready to answer from in seconds.</p>
          </li>
          <li>
            <h3>Customers ask on your help page</h3>
            <p>
              Answers come only from your documents, with the file and page for every claim. If the
              documents don&rsquo;t cover it, it says so instead of guessing.
            </p>
          </li>
          <li>
            <h3>You see what&rsquo;s missing</h3>
            <p>
              Questions it couldn&rsquo;t answer appear on your dashboard, so you know exactly which
              document to add next.
            </p>
          </li>
        </ol>
        <p className={styles.howCta}>
          <Link href="/signup">Create your help centre, free</Link>
        </p>
      </section>
    </main>
  );
}
