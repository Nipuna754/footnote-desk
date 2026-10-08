"use client";

import { useRef, useState } from "react";
import styles from "./HelpLink.module.css";

/** The owner's public help page: the full address, plus copy and open buttons. */
export function HelpLink({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const urlRef = useRef<HTMLElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      // Some browsers block the clipboard; select the link so it can be copied by hand.
      const range = document.createRange();
      if (urlRef.current) range.selectNodeContents(urlRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      setState("failed");
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>Your help page</p>
      <p className={styles.hint}>This is where your customers ask questions. Share the link, or add it to your website.</p>
      <div className={styles.row}>
        <code ref={urlRef} className={styles.url}>{url.replace(/^https?:\/\//, "")}</code>
        <button type="button" className={styles.button} onClick={copy}>
          {state === "copied" ? "Copied" : "Copy link"}
        </button>
        <a className={styles.button} href={url} target="_blank" rel="noopener">
          Open<span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </div>
      <p role="status" className={state === "failed" ? styles.hint : "visually-hidden"}>
        {state === "copied" ? "Link copied" : state === "failed" ? "Couldn't copy automatically. The link is selected: press Cmd+C (or Ctrl+C) to copy it." : ""}
      </p>
    </div>
  );
}
