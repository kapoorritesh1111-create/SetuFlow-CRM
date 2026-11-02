create table if not exists public.smc_stripe_payment_links (
 token text primary key,
 invoice_id uuid not null references public.smc_subscription_invoices(id) on delete restrict,
 organization_id uuid not null references public.organizations(id) on delete restrict,
 stripe_session_id text not null unique,
 stripe_checkout_url text not null,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index if not exists smc_stripe_payment_links_invoice_created_idx on public.smc_stripe_payment_links(invoice_id,created_at desc);
alter table public.smc_stripe_payment_links enable row level security;
revoke all on public.smc_stripe_payment_links from anon,authenticated;
