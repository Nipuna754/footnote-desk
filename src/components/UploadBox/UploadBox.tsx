"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { browserClient } from "@/lib/supabase/browser";
import styles from "./UploadBox.module.css";

const MAX_MB = 10;
const TYPES: Record<string, string> = { ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown" };

/**
 * Uploads straight to the owner's own Storage folder (row-level security checks
 * the folder), then asks the server to read the file and index it.
 */
export function UploadBox({ workspaceId, remaining }: { workspaceId: string; remaining: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!TYPES[ext]) {
      return setMessage({ text: `${file.name} isn't a PDF, TXT or Markdown file. Choose one of those.`, error: true });
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return setMessage({ text: `${file.name} is over ${MAX_MB} MB. Split it or compress it, then try again.`, error: true });
    }

    setBusy(true);
    setMessage({ text: `Uploading and reading ${file.name}. Large files can take up to a minute.`, error: false });

    const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-100);
    const path = `${workspaceId}/${crypto.randomUUID()}-${safe}`;
    const { error } = await browserClient()
      .storage.from("documents")
      .upload(path, file, { contentType: TYPES[ext] });

    if (error) {
      setBusy(false);
      return setMessage({ text: `Couldn't upload ${file.name}. Check your connection and try again.`, error: true });
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, fileName: file.name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);

    setBusy(false);
    setMessage(
      res?.ok
        ? { text: `${file.name} is ready. Customers can ask about it now.`, error: false }
        : { text: data?.error ?? `Couldn't process ${file.name}. Try again.`, error: true },
    );
    router.refresh();
  }

  if (remaining <= 0) {
    return (
      <p className={styles.full}>
        You&rsquo;ve used every document slot on your plan. Delete a document or <a href="/pricing">upgrade to Pro</a> to add more.
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.zone} data-busy={busy || undefined}>
        <input
          id="upload"
          type="file"
          accept={Object.keys(TYPES).join(",")}
          className={styles.input}
          onChange={onChange}
          disabled={busy}
          aria-describedby="upload-hint"
        />
        <label htmlFor="upload" className={styles.label}>
          <strong>{busy ? "Working on it…" : "Add a document"}</strong>
          <span id="upload-hint" className={styles.hint}>
            Drop a file here or choose one. PDF, TXT or Markdown, up to {MAX_MB} MB.{" "}
            {remaining} {remaining === 1 ? "slot" : "slots"} left on your plan.
          </span>
        </label>
      </div>
      <p role="status" className={message?.error ? styles.error : styles.ok}>
        {message?.text}
      </p>
    </div>
  );
}
