begin;

create table if not exists public.pricing_v5_review_feedback (
  id uuid primary key default gen_random_uuid(),
  reviewer_name text not null,
  review_mode text not null check (review_mode in ('admin','sales')),
  step_key text,
  rating smallint check (rating between 1 and 5),
  priority text not null default 'normal' check (priority in ('normal','important','blocker')),
  feedback text not null,
  page_path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_v5_review_feedback_created_at
  on public.pricing_v5_review_feedback(created_at desc);
create index if not exists idx_pricing_v5_review_feedback_mode_step
  on public.pricing_v5_review_feedback(review_mode, step_key, created_at desc);

alter table public.pricing_v5_review_feedback enable row level security;
revoke all on public.pricing_v5_review_feedback from anon, authenticated;

comment on table public.pricing_v5_review_feedback is
  'Public stakeholder feedback captured from the Pricing v5 review prototype. Writes occur only through the server-side public feedback endpoint.';

commit;
