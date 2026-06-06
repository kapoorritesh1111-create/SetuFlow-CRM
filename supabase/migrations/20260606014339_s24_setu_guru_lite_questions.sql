create table if not exists public.setu_guru_lite_questions (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  question text not null,
  answer_intent text,
  matched_public_source text,
  answered boolean not null default false,
  fallback_reason text,
  feedback text,
  session_id text,
  created_at timestamptz not null default now()
);

alter table public.setu_guru_lite_questions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'setu_guru_lite_questions'
      and policyname = 'Public visitors can submit Setu Guru Lite questions'
  ) then
    create policy "Public visitors can submit Setu Guru Lite questions"
      on public.setu_guru_lite_questions
      for insert
      to anon, authenticated
      with check (
        length(trim(page_path)) between 1 and 200
        and length(trim(question)) between 1 and 1000
        and (session_id is null or length(session_id) <= 120)
        and (feedback is null or feedback in ('up', 'down'))
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'setu_guru_lite_questions'
      and policyname = 'Service role can manage Setu Guru Lite questions'
  ) then
    create policy "Service role can manage Setu Guru Lite questions"
      on public.setu_guru_lite_questions
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists setu_guru_lite_questions_created_at_idx on public.setu_guru_lite_questions (created_at desc);
create index if not exists setu_guru_lite_questions_page_path_idx on public.setu_guru_lite_questions (page_path);
