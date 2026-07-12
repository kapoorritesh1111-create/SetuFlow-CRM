# SETU Flow Documentation Workspace v3

This rebuild turns `public/internal/setuflow-docs.html` into a topic-based documentation workspace.

## Key fixes

- External shared links hide Issue Tracker, Roadmap, Live CRM, tracker counts, and upload actions.
- Overview is a product explanation and guided topic entry, not duplicate navigation.
- Each documentation topic renders as a professional workspace page instead of a broken long-scroll document.
- Swimlane diagrams are rebuilt as structured operator/system cards.
- Commercial workflows, operator guides, Guru AI, business-card scan, smart vCard, and quick reference are represented as premium sections.
- Contributor rail shows only Ritesh Kapoor.
- Live UI Snapshots has direct upload from the documentation workspace.

## Screenshot persistence

Apply migration:

`supabase/migrations/20260528010000_docs_workspace_screenshots.sql`

The page calls:

- `GET /api/internal/docs-screenshots` for internal users.
- `GET /api/internal/docs-screenshots?share_token=...` for shared reviewers.
- `POST /api/internal/docs-screenshots` for authenticated internal uploads.

If the API or migration is not live yet, upload falls back to browser localStorage for the current user.

## Files changed

- `public/internal/setuflow-docs.html`
- `public/internal/setuflow-docs-workspace.css`
- `public/internal/setuflow-docs-workspace.js`
- `public/internal/docs-screenshots/*`
- `src/app/api/internal/docs-metrics/route.ts`
- `src/app/api/internal/docs-screenshots/route.ts`
- `supabase/migrations/20260528010000_docs_workspace_screenshots.sql`
