-- S33-QA-005 — Close anon write paths.  ** APPLY AT DEPLOY, together with the code that
-- retires the static apps **  (issue-tracker + e2e deleted; demo-checklist repointed to qa_findings).
-- Applying this BEFORE that code is live would break the still-deployed static apps.
--
-- Posture after this migration:
--   sprint_issues   : anon SELECT retained (Docs Hub counts / Share Doc); anon INSERT + UPDATE removed.
--   qa_test_runs / qa_step_results / qa_evidence : anon SELECT retained (internal reads); anon INSERT + UPDATE removed.
--   (Native QA workspace writes via service role; external tester flow validates a token server-side.)

-- sprint_issues: only SMC (authenticated) may create/edit issues now.
DROP POLICY IF EXISTS anon_insert_setu_flow_sprint_issues ON public.sprint_issues;
DROP POLICY IF EXISTS anon_update_setu_flow_sprint_issues ON public.sprint_issues;

-- QA run tables: no more anonymous writes (the old e2e app is gone).
DROP POLICY IF EXISTS anon_insert_qa_runs ON public.qa_test_runs;
DROP POLICY IF EXISTS anon_update_qa_runs ON public.qa_test_runs;
DROP POLICY IF EXISTS anon_insert_qa_steps ON public.qa_step_results;
DROP POLICY IF EXISTS anon_update_qa_steps ON public.qa_step_results;
DROP POLICY IF EXISTS anon_insert_qa_evidence ON public.qa_evidence;

-- Optionally tighten table grants (RLS already blocks, this removes the privilege entirely):
REVOKE INSERT, UPDATE ON public.sprint_issues FROM anon;
REVOKE INSERT, UPDATE ON public.qa_test_runs FROM anon;
REVOKE INSERT, UPDATE ON public.qa_step_results FROM anon;
REVOKE INSERT ON public.qa_evidence FROM anon;
