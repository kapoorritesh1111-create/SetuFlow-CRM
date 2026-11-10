-- Role-aware SETU Guru learning: harden visibility of existing review/feedback tables.
-- No new engine or table. Apply as part of the reviewed release.
-- Only org administrators can read pending/unapproved knowledge; org members may read approved material.
ALTER POLICY "guru_review_queue_select_org_scoped"
  ON public.guru_ingestion_review_queue
  USING (public.is_org_member(organization_id) AND (status = 'approved' OR public.is_org_admin(organization_id)));

-- Feedback captures user questions/answers and must not be readable by every tenant member.
ALTER POLICY "setu_guru_feedback_select"
  ON public.setu_guru_feedback
  USING (auth.uid() = user_id OR public.is_org_admin(organization_id));

ALTER POLICY "setu_guru_feedback_insert"
  ON public.setu_guru_feedback
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(organization_id));
