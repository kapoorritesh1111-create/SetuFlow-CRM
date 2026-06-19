-- APPLIED LIVE via Supabase MCP on 2026-06-19. Kept here for repo history.
-- Per-case "where to test" link. (Screenshot evidence reuses existing qa_findings.evidence_url
-- and the existing public 'qa-evidence' bucket; no new bucket / RLS / anon policy.)
ALTER TABLE public.qa_test_cases ADD COLUMN IF NOT EXISTS target_path text;
UPDATE public.qa_test_cases SET target_path='/leads'            WHERE suite_key='capture-to-lead'  AND target_path IS NULL;
UPDATE public.qa_test_cases SET target_path='/quotes'           WHERE suite_key='quote-pricing'    AND target_path IS NULL;
UPDATE public.qa_test_cases SET target_path='/quotes'           WHERE suite_key='approval-gates'   AND target_path IS NULL;
UPDATE public.qa_test_cases SET target_path='/orders'           WHERE suite_key='quote-to-order'   AND target_path IS NULL;
UPDATE public.qa_test_cases SET target_path='/documents'        WHERE suite_key='quote-to-order'   AND case_key IN ('qo-03','qo-05');
UPDATE public.qa_test_cases SET target_path='/trade-events'     WHERE suite_key='trade-show-trial' AND target_path IS NULL;
UPDATE public.qa_test_cases SET target_path='/trade-show-trial' WHERE suite_key='trade-show-trial' AND case_key='ts-01';
UPDATE public.qa_test_cases SET target_path='/admin'            WHERE suite_key='admin-governance' AND target_path IS NULL;
