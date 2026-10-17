import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm/AuthForm";
import { currentOwner } from "@/lib/supabase/server";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage() {
  // "Log in" in the menu is also how signed-in owners get back to their dashboard
  if (await currentOwner()) redirect("/dashboard");
  return (
    <main id="main" className={`container ${styles.main}`}>
      <div className={styles.card}>
        <header>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.lede}>Manage your documents and see what customers asked.</p>
        </header>
        <AuthForm mode="signin" />
      </div>
    </main>
  );
}
