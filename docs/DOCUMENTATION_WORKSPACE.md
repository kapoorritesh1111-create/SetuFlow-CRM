# SETU Flow Documentation Workspace Rebuild

## Purpose

The documentation workspace has been rebuilt to keep the newer premium, topic-by-topic layout while restoring and upgrading the stronger information architecture from the older documentation.

## What changed

- Replaced the earlier documentation landing experience with a premium single-topic workspace.
- Restored deeper product, architecture, workflow and operational content.
- Added upgraded diagrams for:
  - architecture
  - commercial lifecycle
  - Setu Guru review loop
  - mobile capture and smart contact flow
- Added a secure internal auth gate for the static documentation page.
- Added external shared-link mode with internal-only sections and controls hidden.
- Added direct screenshot upload support inside the documentation workspace.
- Added a live snapshot gallery to support documentation and review workflows.
- Added internal documentation metrics for modules, issue count, roadmap count and snapshot count.

## Files added or rebuilt

- `public/internal/setuflow-docs.html`
- `public/internal/setuflow-docs-workspace.css`
- `public/internal/setuflow-docs-workspace.js`
- `public/internal/docs-assets/*`
- `src/app/api/internal/docs-metrics/route.ts`
- `src/app/api/internal/docs-screenshots/route.ts`
- `supabase/migrations/20260527093000_docs_workspace_screenshots.sql`

## Security model

### Internal access

The documentation page uses `/api/internal/auth-check` to confirm the viewer is authenticated and belongs to the SETU Flow organisation.

### Shared access

Shared links are time-bound. Shared mode hides:

- issue tracker links
- roadmap links
- internal share management controls
- internal status widgets
- screenshot upload controls

Shared mode continues to show approved documentation content and the snapshot gallery.

## Screenshot gallery model

Internal users can upload screenshots from the documentation workspace. The page:

1. attempts server upload through `/api/internal/docs-screenshots`
2. stores screenshot metadata in `docs_workspace_screenshots`
3. uploads the image into the `docs-workspace` storage bucket
4. falls back to browser-local storage if the API is unavailable

## Contributor context

The current documentation contributor context is intentionally minimal and currently shows a single contributor profile for Ritesh Kapoor. The layout is ready to support additional contributors later.
