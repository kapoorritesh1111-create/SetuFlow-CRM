Continue Setu Flow CRM from the Sprint 37 canonical workflow package. Treat the 10 approved images and these files as source of truth:

- docs/S37_CANONICAL_WORKFLOW_MAP.md
- docs/S37_DEPRECATION_PLAN.md
- docs/S37_CANONICAL_ACTIONS_COMPLETION.md

Do not restore old nested `/leads?leadId=&view=*` workflows. Use only:

- `/leads`
- `/leads/[leadId]`
- `/leads/[leadId]/quote?quoteId=&step=1..5`

Before changing code, verify live GitHub main, Supabase, and Vercel. Keep parent quote status/pointers DB-derived from quote_versions.
