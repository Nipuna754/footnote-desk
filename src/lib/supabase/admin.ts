import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses row-level security. Server code only, and
 * only after the code itself has checked who is allowed to do what.
 */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase keys are missing from .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}
