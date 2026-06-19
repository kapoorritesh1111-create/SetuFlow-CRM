-- S32-SMC-003 — Seed initial internal runbooks (idempotent on slug).
INSERT INTO public.smc_wiki_pages (organization_id, slug, title, content, category, author_name, pinned)
SELECT '3327b9a7-aadb-44b0-9793-30c4045d3c92', 'deploy-runbook', 'Deploy Runbook',
$md$# Deploy Runbook

## Before deploy
- Confirm `tsc --noEmit` is clean and tests pass.
- Confirm the target sprint issues are in_review with acceptance criteria met.

## Deploy
- Merge to main; Vercel builds automatically.
- Watch the build logs; confirm the preview renders before promoting.

## After deploy
- Smoke-test the changed surfaces.
- If a regression appears, roll back to the previous Vercel deployment immediately, then open an incident.$md$,
'runbook', 'SETU Flow', true
WHERE NOT EXISTS (SELECT 1 FROM public.smc_wiki_pages WHERE slug = 'deploy-runbook');

INSERT INTO public.smc_wiki_pages (organization_id, slug, title, content, category, author_name, pinned)
SELECT '3327b9a7-aadb-44b0-9793-30c4045d3c92', 'incident-response-runbook', 'Incident Response Runbook',
$md$# Incident Response Runbook

## Declare
- Open an incident in Mission Control with a severity (P0 system-down through P3 minor).
- Name an incident commander.

## Mitigate
- Stabilise first (roll back or disable the offending change), diagnose second.
- Keep a timeline of actions as you go.

## Resolve and learn
- Mark the incident resolved with a resolution note (this stamps MTTR).
- For P0/P1, write a short postmortem: cause, impact, what prevents recurrence.$md$,
'runbook', 'SETU Flow', true
WHERE NOT EXISTS (SELECT 1 FROM public.smc_wiki_pages WHERE slug = 'incident-response-runbook');
