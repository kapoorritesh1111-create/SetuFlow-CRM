# Setu Flow Core Academy Foundation

## Route

- Core Academy: `/core-academy`
- Packaging Academy remains on `/academy` through the existing packaging guide rewrite.

## Current scope

- 7 curriculum modules
- 44 guided workflow screens
- Exact screenshot filename placeholder for every guided screen
- Search across workflows, routes, visible UI requirements, and filenames
- Per-user completion tracking
- Local progress fallback plus live Supabase sync

## Isolation boundary

Core Academy uses only:

- `src/app/core-academy`
- `src/app/api/core-academy`
- `src/features/academy/core-academy-*`
- `public.core_academy_progress`

It does not read or write:

- `packaging_learning_progress`
- `packaging_test_runs`
- `packaging_test_results`
- `packaging-test-evidence`
- Packaging Academy issue automation or route metadata triggers

## Screenshot replacement rule

Each Academy card shows the exact expected screenshot filename. When screenshots are captured, add the image using that filename and replace the visual placeholder without changing the step ID, route, or progress identity.
