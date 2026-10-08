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
    </main>
  );
}
