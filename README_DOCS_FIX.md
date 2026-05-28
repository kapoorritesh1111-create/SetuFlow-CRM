# SETU Flow Docs Rich Content Premium Fix

This patch replaces `public/internal/setuflow-docs.html` with a self-contained premium documentation page that restores the old rich documentation content, architecture diagrams, Mermaid diagrams, swimlanes, operator guides, and live UI snapshot reference section.

## Important fixes

- The page no longer depends on a separate CSS file for the primary layout.
- Build/recovery notes were removed from the visible workspace.
- The old rich architecture, workflow, swimlane, and operator-guide content is preserved.
- The new Product Overview concept is retained.
- Internal controls remain hidden in shared-token mode.
- The Live UI Snapshots section now includes a premium Add Screenshot upload panel.
- Screenshot upload tries `/api/internal/docs-screenshots` first and falls back to browser-local storage if the API is unavailable.

## Apply

Copy the folder contents into the repo root. The key file is:

`public/internal/setuflow-docs.html`

The Supabase migration was already applied live in the SETU Flow CRM project, and the `docs-workspace` public storage bucket has been verified.
