-- Roll back app code first. No notification records were deleted or rewritten.
drop function if exists public.setu_communication_notifications_today(uuid,text,integer);
drop function if exists public.setu_notice_occurrence_start(text,uuid);
