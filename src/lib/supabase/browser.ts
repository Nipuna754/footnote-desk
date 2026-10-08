import { createBrowserClient } from "@supabase/ssr";

/** Browser client: only ever holds the public key, and acts as the signed-in owner. */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
