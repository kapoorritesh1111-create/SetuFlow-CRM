-- SETU Flow SMC Stripe foundation: additive, no existing invoice mutation.
create table if not exists public.smc_stripe_customers (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.smc_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  invoice_id uuid not null references public.smc_subscription_invoices(id) on delete restrict,
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  provider text not null check (provider in ('stripe','manual')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending','succeeded','refunded','partially_refunded','failed')),
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, invoice_id, organization_id)
);
create index if not exists smc_invoice_payments_invoice_idx on public.smc_invoice_payments(invoice_id, status);
create table if not exists public.smc_stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.smc_stripe_customers enable row level security;
alter table public.smc_invoice_payments enable row level security;
alter table public.smc_stripe_events enable row level security;
revoke all on public.smc_stripe_customers, public.smc_invoice_payments, public.smc_stripe_events from anon, authenticated;
-- All writes are server-side with verified authentication and service credentials.
