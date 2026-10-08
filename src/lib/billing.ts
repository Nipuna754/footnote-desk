/*
  Lemon Squeezy, test mode only. Plans change in exactly one place:
  applyBillingEvent, which only receives events whose signature was verified.
*/
import { createHmac, timingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";

const API = "https://api.lemonsqueezy.com/v1";

function config() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
  if (!apiKey || !storeId || !variantId) throw new Error("Lemon Squeezy settings are missing from .env.local");
  return { apiKey, storeId, variantId };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${config().apiKey}`,
    },
  });
  if (!res.ok) throw new Error(`Lemon Squeezy ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** A hosted checkout page for Pro, tied to this workspace. Always test mode. */
export async function createCheckout(workspace: { id: string }, email: string | undefined, origin: string) {
  const { storeId, variantId } = config();
  const res = await api<{ data: { attributes: { url: string } } }>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { email, custom: { workspace_id: workspace.id } },
          product_options: { redirect_url: `${origin}/dashboard?upgrade=success` },
          test_mode: true, // portfolio demo: no real card is ever charged
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });
  return res.data.attributes.url;
}

/** Lemon Squeezy's own page for changing the card or cancelling. The link lasts 24 hours. */
export async function portalUrl(subscriptionId: string) {
  const res = await api<{ data: { attributes: { urls: { customer_portal: string } } } }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
  return res.data.attributes.urls.customer_portal;
}

/** True only if the body was signed with our webhook secret (HMAC-SHA256, hex). */
export function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const given = Buffer.from(signature, "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** "past_due" keeps Pro while the card is retried; "cancelled" keeps it until the period ends. */
const PRO_STATUSES = new Set(["on_trial", "active", "past_due", "cancelled"]);

type BillingEvent = {
  meta?: { event_name?: string; custom_data?: { workspace_id?: string } };
  data?: {
    type?: string;
    id?: string;
    attributes?: { status?: string; customer_id?: number; store_id?: number; variant_id?: number; test_mode?: boolean };
  };
};

export async function applyBillingEvent(event: BillingEvent) {
  const name = event.meta?.event_name ?? "";
  const workspaceId = event.meta?.custom_data?.workspace_id;
  const sub = event.data;
  if (!name.startsWith("subscription_") || sub?.type !== "subscriptions" || !sub.id || !sub.attributes) return "ignored";
  const { storeId, variantId } = config();
  if (String(sub.attributes.store_id) !== storeId) return "ignored: other store";
  if (String(sub.attributes.variant_id) !== variantId) return "ignored: not the Pro plan";
  if (sub.attributes.test_mode !== true) return "ignored: live mode";
  if (!workspaceId) return "ignored: no workspace";

  const plan = PRO_STATUSES.has(sub.attributes.status ?? "") ? "pro" : "free";
  const { data } = await adminClient()
    .from("workspaces")
    .update({
      plan,
      billing_customer_id: String(sub.attributes.customer_id),
      billing_subscription_id: sub.id,
    })
    .eq("id", workspaceId)
    .select("id");
  return data?.length ? `plan set to ${plan}` : "ignored: unknown workspace";
}
