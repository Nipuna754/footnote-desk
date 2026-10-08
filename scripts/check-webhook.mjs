// Proves the plan only changes for genuine, signed Lemon Squeezy events.
// Needs the dev server running and the LEMONSQUEEZY_* values in .env.local.
// Run: node --experimental-websocket --env-file=.env.local scripts/check-webhook.mjs
// (set WEBHOOK_URL if the app isn't on http://localhost:3001)
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";

const URL = process.env.WEBHOOK_URL ?? "http://localhost:3001/api/billing/webhook";
const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const store = Number(process.env.LEMONSQUEEZY_STORE_ID);
const variant = Number(process.env.LEMONSQUEEZY_PRO_VARIANT_ID);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
};

const sign = (body, key = secret) => createHmac("sha256", key).update(body).digest("hex");
const send = async (event, signature) => {
  const body = JSON.stringify(event);
  const headers = { "Content-Type": "application/json" };
  const sig = signature === undefined ? sign(body) : signature;
  if (sig !== null) headers["X-Signature"] = sig;
  return (await fetch(URL, { method: "POST", headers, body })).status;
};
const plan = async (id) => (await admin.from("workspaces").select("plan").eq("id", id).single()).data?.plan;

const { data: user } = await admin.auth.admin.createUser({
  email: `webhook-test-${randomUUID().slice(0, 8)}@example.com`,
  password: randomUUID(),
  email_confirm: true,
  user_metadata: { company: "Webhook Test" },
});
const { data: ws } = await admin.from("workspaces").select("id").eq("owner_id", user.user.id).single();

const event = (status, overrides = {}) => ({
  meta: { event_name: "subscription_updated", custom_data: { workspace_id: ws.id } },
  data: {
    type: "subscriptions",
    id: String(Math.floor(Math.random() * 1e9)),
    attributes: { status, customer_id: 42, store_id: store, variant_id: variant, test_mode: true, ...overrides },
  },
});

try {
  check("rejects an event with no signature", (await send(event("active"), null)) === 401);
  check("rejects a forged signature", (await send(event("active"), "0".repeat(64))) === 401);
  check("rejects an event signed with the wrong secret", (await send(event("active"), sign(JSON.stringify(event("active")), "wrong"))) === 401);
  check("plan unchanged after rejected events", (await plan(ws.id)) === "free");

  await send(event("active", { store_id: store + 1 }));
  check("ignores a signed event from another store", (await plan(ws.id)) === "free");
  await send(event("active", { variant_id: variant + 1 }));
  check("ignores a signed event for another product", (await plan(ws.id)) === "free");
  await send(event("active", { test_mode: false }));
  check("ignores live-mode events", (await plan(ws.id)) === "free");

  check("accepts a genuine active subscription", (await send(event("active"))) === 200);
  check("plan is now Pro", (await plan(ws.id)) === "pro");

  await send(event("cancelled"));
  check("cancelled keeps Pro until the period ends", (await plan(ws.id)) === "pro");
  await send(event("expired"));
  check("expired subscription returns to Free", (await plan(ws.id)) === "free");
  await send(event("past_due"));
  check("past due keeps Pro while the card is retried", (await plan(ws.id)) === "pro");
  await send(event("unpaid"));
  check("unpaid drops to Free", (await plan(ws.id)) === "free");
} finally {
  await admin.auth.admin.deleteUser(user.user.id);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll webhook checks passed");
process.exit(failures ? 1 : 0);
