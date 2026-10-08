"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteNav.module.css";

const links = [
  { href: "/", label: "Demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <header className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="Footnote Desk home">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <rect x="6" y="10" width="12" height="5" rx="1" fill="#fbe55a" />
            <path d="M6 7h12M6 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Footnote Desk
        </Link>
        <nav aria-label="Main">
          <ul className={styles.links}>
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={styles.link}
                  aria-current={path === l.href ? "page" : undefined}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
