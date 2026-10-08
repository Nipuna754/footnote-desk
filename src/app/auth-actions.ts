"use server";

import { redirect } from "next/navigation";
import { userClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string; email?: string; company?: string };

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const company = text(form, "company");
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  const keep = { email, company };

  if (!company || company.length > 80) return { ...keep, error: "Enter your company name (up to 80 characters)." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ...keep, error: "Enter a valid email address." };
  if (password.length < 8) return { ...keep, error: "Use a password of at least 8 characters." };

  const db = await userClient();
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { company } } });
  if (error) return { ...keep, error: signUpError(error.code) };
  if (!data.session) return { ...keep, notice: `Check ${email} for a link to confirm your account, then sign in.` };
  redirect("/dashboard");
}

function signUpError(code?: string) {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "There's already an account with that email. Sign in instead.";
    case "email_address_invalid":
      return "That email address can't be used. Try a different one.";
    case "weak_password":
      return "Choose a stronger password: longer, and not a common one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many sign-ups right now. Try again in a few minutes.";
    default:
      return "Couldn't create your account. Try again.";
  }
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  const db = await userClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { email, error: "That email and password don't match an account." };
  redirect("/dashboard");
}

export async function signOut() {
  const db = await userClient();
  await db.auth.signOut();
  redirect("/");
}
