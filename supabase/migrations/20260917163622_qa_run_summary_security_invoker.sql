-- Do not let the QA summary view bypass the querying user's table/RLS rights.
alter view public.qa_run_summary set (security_invoker = true);
