create or replace function public.set_packaging_academy_result_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tested_route := coalesce(nullif(btrim(new.tested_route), ''), case new.workflow
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
    else '/academy'
  end);
  new.academy_version := coalesce(nullif(btrim(new.academy_version), ''), '2026.07.25-v6');
  return new;
end;
$$;

drop trigger if exists trg_set_packaging_academy_result_metadata on public.packaging_test_results;
create trigger trg_set_packaging_academy_result_metadata
before insert or update of workflow, tested_route, academy_version
on public.packaging_test_results
for each row execute function public.set_packaging_academy_result_metadata();

create or replace function public.scope_packaging_academy_sprint_issue()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_route text;
begin
  if coalesce(new.submitted_via, '') <> 'Packaging Academy' then
    return new;
  end if;

  v_route := case new.workflow_area
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
    else coalesce(nullif(new.affected_route, ''), '/academy')
  end;

  new.affected_route := v_route;
  new.affected_module := coalesce(nullif(new.workflow_area, ''), 'Packaging Academy');
  if position(v_route in coalesce(new.steps_to_reproduce, '')) = 0 then
    new.steps_to_reproduce := concat('Open ', v_route, ' in the Packaging workspace. ', coalesce(new.steps_to_reproduce, 'Execute the recorded Academy step.'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_scope_packaging_academy_sprint_issue on public.sprint_issues;
create trigger trg_scope_packaging_academy_sprint_issue
before insert or update of submitted_via, workflow_area, affected_route, affected_module, steps_to_reproduce
on public.sprint_issues
for each row execute function public.scope_packaging_academy_sprint_issue();

update public.sprint_issues
set affected_route = affected_route
where submitted_via = 'Packaging Academy';

revoke all on function public.set_packaging_academy_result_metadata() from public;
revoke all on function public.scope_packaging_academy_sprint_issue() from public;