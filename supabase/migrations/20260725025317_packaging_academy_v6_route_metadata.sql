alter table public.packaging_test_results
  add column if not exists tested_route text,
  add column if not exists academy_version text;

comment on column public.packaging_test_results.tested_route is
  'Actual application route validated by this Academy step.';
comment on column public.packaging_test_results.academy_version is
  'Packaging Academy catalog version used when the result was recorded.';

update public.packaging_test_results
set tested_route = case workflow
  when 'Capture' then '/contact-exchange/scan'
  when 'Qualification' then '/leads'
  when 'Quote Builder' then '/quotes'
  when 'Approvals & Sending' then '/approval-send'
  when 'Quote Management & Outcomes' then '/quotes'
  when 'Orders / Execution' then '/orders'
  when 'Design & Proofs' then '/design-queue'
  when 'Production & Dispatch' then '/dispatch-board'
  when 'Catalog & Packaging Pricing' then '/products'
  when 'Tasks' then '/tasks'
  when 'Trade Events' then '/trade-events'
  when 'Admin & Settings' then '/admin/organization'
  else coalesce(tested_route, '/academy')
end
where tested_route is null;

create index if not exists idx_packaging_test_results_route
  on public.packaging_test_results (organization_id, tested_route, tested_at desc);