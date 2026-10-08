"use client";

import { useState } from "react";
import { renameWorkspace } from "@/app/dashboard/actions";
import styles from "./RenameWorkspace.module.css";

/** The company name as the page title, with an Edit button that swaps in a small form. */
export function RenameWorkspace({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className={styles.row}>
        <h1 className={styles.title}>{name}</h1>
        <button type="button" className={styles.edit} onClick={() => setEditing(true)}>
          Edit<span className="visually-hidden"> company name</span>
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      action={async (form) => {
        await renameWorkspace(form);
        setEditing(false);
      }}
    >
      <h1 className="visually-hidden">{name}</h1>
      <label htmlFor="workspace-name" className={styles.label}>
        Company name
      </label>
      <div className={styles.row}>
        <input
          id="workspace-name"
          name="name"
          className={styles.input}
          defaultValue={name}
          required
          maxLength={80}
          autoFocus
          aria-describedby="workspace-name-hint"
        />
        <button className={styles.save}>Save</button>
        <button type="button" className={styles.edit} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
      <p id="workspace-name-hint" className={styles.hint}>
        Shown on your help page. Your link stays the same.
      </p>
    </form>
  );
}
