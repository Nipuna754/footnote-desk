"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/auth-actions";
import styles from "./AuthForm.module.css";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  const [state, action, pending] = useActionState<AuthState, FormData>(isSignup ? signUp : signIn, {});
  const label = isSignup ? "Create account" : "Sign in";

  return (
    <form action={action} className={styles.form} noValidate>
      {isSignup && (
        <div className={styles.field}>
          <label htmlFor="company">Company name</label>
          <input id="company" name="company" defaultValue={state.company} required maxLength={80} autoComplete="organization" />
          <p className={styles.hint}>Shown to your customers at the top of your help page.</p>
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={state.email} required autoComplete="email" />
      </div>
      <div className={styles.field}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignup ? "new-password" : "current-password"}
          aria-describedby={isSignup ? "password-hint" : undefined}
        />
        {isSignup && (
          <p id="password-hint" className={styles.hint}>
            At least 8 characters.
          </p>
        )}
      </div>

      <div role="alert" className={styles.error}>
        {state.error}
      </div>
      {state.notice && (
        <p role="status" className={styles.notice}>
          {state.notice}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? `${label}…` : label}
      </button>

      <p className={styles.switch}>
        {isSignup ? (
          <>
            Already have an account? <Link href="/signin">Sign in</Link>
          </>
        ) : (
          <>
            New to Footnote Desk? <Link href="/signup">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
