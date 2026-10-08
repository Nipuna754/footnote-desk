import { currentOwner } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { portalUrl } from "@/lib/billing";

/** Lemon Squeezy's page for changing the card or cancelling Pro. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const owner = await currentOwner();
  if (!owner) return Response.redirect(`${origin}/signin`, 303);

  const { data: ws } = await adminClient()
    .from("workspaces")
    .select("billing_subscription_id")
    .eq("id", owner.workspace.id)
    .single();
  if (!ws?.billing_subscription_id) return Response.redirect(`${origin}/dashboard`, 303);

  try {
    return Response.redirect(await portalUrl(ws.billing_subscription_id), 303);
  } catch (e) {
    console.error("portal failed", e);
    return Response.redirect(`${origin}/dashboard?upgrade=error`, 303);
  }
}
