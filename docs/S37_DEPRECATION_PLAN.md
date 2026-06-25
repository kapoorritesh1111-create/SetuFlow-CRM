# Sprint 37 Deprecation Plan

## Deprecated Route Patterns

| Old pattern | Replacement | Status |
|---|---|---|
| `/leads?leadId=[id]&view=quote` | `/leads/[id]/quote` | Deprecated, redirected in `/leads/page.tsx` |
| `/leads?leadId=[id]&view=cc` | `/leads/[id]` | Deprecated, redirected in `/leads/page.tsx` |
| `/leads?leadId=[id]&view=workflow` | `/leads/[id]` | Deprecated, redirected in `/leads/page.tsx` |
| Inline quote builder inside LeadsWorkspace | `/leads/[id]/quote?step=1..5` | Delete candidate after validation |
| QuoteWorkspace as primary panel | Canonical quote builder | Legacy support only |
| Buyer detail legacy component | Canonical lead detail | Delete candidate after validation |

## Files Marked or Redirected

- `src/app/(app)/leads/page.tsx` redirects legacy nested `view` routes.
- `src/features/quotes/components/quote-workspace.tsx` is marked `S37_DEPRECATED` / legacy support only.
- `src/features/leads/components/buyer-detail-page.tsx` is marked `S37_DEPRECATED`.
- Command-center quote links were updated to `/leads/[leadId]/quote`.
- Compliance-assist return links now return to canonical quote review step.
- RFQ quote links now return to canonical quote builder.

## Deletion Gate

Do not delete legacy files until all checks pass:

1. `/leads` full workspace still works.
2. `/leads/[leadId]` canonical detail works.
3. `/leads/[leadId]/quote?step=1..5` works.
4. Locked quote flow works.
5. No tracked imports require the old inline quote workspace as a primary screen.

After validation, delete candidates can be removed in a separate cleanup PR/commit.
