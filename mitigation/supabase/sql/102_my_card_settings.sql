create table if not exists public.my_card_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  share_slug text not null unique,
  primary_phone text,
  secondary_phone text,
  website text,
  address text,
  booking_url text,
  quote_url text,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_my_card_settings_org on public.my_card_settings(organization_id);
create index if not exists idx_my_card_settings_share_slug on public.my_card_settings(share_slug);

alter table public.my_card_settings enable row level security;

drop policy if exists "Users can view their own card settings" on public.my_card_settings;
create policy "Users can view their own card settings"
  on public.my_card_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own card settings" on public.my_card_settings;
create policy "Users can insert their own card settings"
  on public.my_card_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own card settings" on public.my_card_settings;
create policy "Users can update their own card settings"
  on public.my_card_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
