import { currentOwner } from "@/lib/supabase/server";
import { createCheckout } from "@/lib/billing";

/** Sends the signed-in owner to the Lemon Squeezy checkout. The plan changes later, in the webhook. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const owner = await currentOwner();
  if (!owner) return Response.redirect(`${origin}/signin`, 303);
  if (owner.workspace.plan === "pro") return Response.redirect(`${origin}/dashboard`, 303);

  try {
    const url = await createCheckout(owner.workspace, owner.user.email, origin);
    return Response.redirect(url, 303);
  } catch (e) {
    console.error("checkout failed", e);
    return Response.redirect(`${origin}/dashboard?upgrade=error`, 303);
  }
}
