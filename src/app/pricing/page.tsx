import type { Metadata } from "next";
import Link from "next/link";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Footnote Desk is free for small help centres. Pro adds more documents and questions.",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "For trying Footnote Desk on a few documents.",
    features: [
      "5 documents (PDF, TXT or Markdown, up to 10 MB)",
      "100 questions a month",
      "Citations to file and page",
      "List of unanswered questions",
    ],
    cta: { label: "Start free", href: "/signup" },
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "a month",
    blurb: "For a help centre customers actually use.",
    features: [
      "50 documents (PDF, TXT or Markdown, up to 10 MB)",
      "2,000 questions a month",
      "Citations to file and page",
      "List of unanswered questions",
      "Change card or cancel any time",
    ],
    cta: { label: "Upgrade to Pro", href: "/dashboard" },
    featured: true,
  },
];

export default function PricingPage() {
  return (
    <main id="main" className={`container ${styles.main}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Pricing</h1>
        <p className={styles.lede}>
          Both plans answer only from your documents and cite every claim. Pro is for when
          you have more to upload and more customers asking.
        </p>
      </header>

      <ul className={styles.plans}>
        {plans.map((p) => (
          <li key={p.name} className={styles.plan} data-featured={p.featured || undefined}>
            <h2 className={styles.planName}>{p.name}</h2>
            <p className={styles.price}>
              <span className={styles.amount}>{p.price}</span> {p.period}
            </p>
            <p className={styles.blurb}>{p.blurb}</p>
            <ul className={styles.features}>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href={p.cta.href} className={styles.cta}>
              {p.cta.label}
            </Link>
          </li>
        ))}
      </ul>

      <p className={styles.note}>
        Payments in this demo run in Lemon Squeezy test mode. No real card is ever charged.
      </p>
    </main>
  );
}
