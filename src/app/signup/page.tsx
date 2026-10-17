import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm/AuthForm";
import { currentOwner } from "@/lib/supabase/server";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  if (await currentOwner()) redirect("/dashboard");
  return (
    <main id="main" className={`container ${styles.main}`}>
      <div className={styles.card}>
        <header>
          <h1 className={styles.title}>Create your help centre</h1>
          <p className={styles.lede}>
            Free for up to 5 documents and 100 questions a month. No card needed.
          </p>
        </header>
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
