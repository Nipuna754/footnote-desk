import { applyBillingEvent, validSignature } from "@/lib/billing";

/** Lemon Squeezy calls this. Nothing changes unless the signature proves the event came from them. */
export async function POST(request: Request) {
  const body = await request.text(); // the raw body, exactly as signed
  if (!validSignature(body, request.headers.get("x-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    const result = await applyBillingEvent(event);
    return Response.json({ received: true, result });
  } catch (e) {
    console.error("webhook failed", e);
    return new Response("Webhook handler failed", { status: 500 }); // Lemon Squeezy retries
  }
}
