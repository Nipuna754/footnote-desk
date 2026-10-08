import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client acting as the signed-in owner, so row-level security applies.
 * Create a new one per request.
 */
export async function userClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server components can't set cookies; the proxy refreshes the session instead.
          }
        },
      },
    },
  );
}

/** The signed-in owner's workspace, or null when nobody is signed in. */
export async function currentOwner() {
  const db = await userClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: workspace } = await db
    .from("workspaces")
    .select("id, name, slug, plan")
    .eq("owner_id", data.user.id)
    .single();
  if (!workspace) return null;
  return { db, user: data.user, workspace: workspace as { id: string; name: string; slug: string; plan: "free" | "pro" } };
}
