-- Align existing evaluated Stark CTWA inquiry scores with the new scoring model.
-- Previous CTWA source weight was +12. The new model preserves normal WhatsApp +8
-- and adds a separate +15 CTWA intent boost (= +23 total), so existing CTWA scores
-- need an +11 delta. Scores remain capped at 100.

update public.lead_intake_staging
set qualification_score = least(100, qualification_score + 11),
    updated_at = now()
where organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
  and lower(coalesce(source_provider, '')) = 'interakt'
  and lower(coalesce(acquisition_type, '')) = 'ctwa'
  and qualification_score is not null;
