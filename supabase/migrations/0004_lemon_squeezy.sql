-- Payments use Lemon Squeezy instead of Stripe (Stripe doesn't accept Sri Lankan accounts).
-- Paste into Supabase: SQL Editor > New query > Run. Safe to run more than once.

alter table public.workspaces drop column if exists stripe_customer_id;
alter table public.workspaces add column if not exists billing_customer_id text;
alter table public.workspaces add column if not exists billing_subscription_id text unique;

-- Owners still can't edit billing columns or their plan: only the verified webhook can.
revoke insert, update, delete on public.workspaces from anon, authenticated;
grant update (name) on public.workspaces to authenticated;
