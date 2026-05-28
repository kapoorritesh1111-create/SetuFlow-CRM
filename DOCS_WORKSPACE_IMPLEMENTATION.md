# SETU Flow Documentation Workspace Implementation

## Changed files

- `public/internal/setuflow-docs.html`
- `public/internal/setuflow-docs-workspace.css`
- `public/internal/setuflow-docs-workspace.js`
- `public/internal/docs-screenshots/manifest.json`
- `public/internal/docs-screenshots/README.md`

## What this build does

- Replaces the broken long-scroll documentation page with a true documentation workspace.
- Preserves the original documentation content by rendering the existing sections as topic templates.
- Shows only the overview or one active topic at a time, with Previous / Next navigation always available.
- Preserves Share Doc modal, share token access, auth check, shared-review banner, Issue Tracker link, Roadmap link, and Mermaid support.
- Pulls live issue counts and roadmap lane signals from the live Supabase `sprint_issues` tracker using the public anon key.
- Adds a manifest-driven Live UI Snapshots gallery.

## Adding screenshots

1. Save screenshots under:
   `public/internal/docs-screenshots/`
2. Add or update an entry in:
   `public/internal/docs-screenshots/manifest.json`
3. The Live UI Snapshots topic reads that manifest and renders the gallery.

Example:

```json
{
  "title": "Pipeline Workspace",
  "route": "/pipeline",
  "description": "Kanban, swimlane, forecast, density controls, and global filters.",
  "image": "pipeline-workspace.png",
  "updated": "2026-05-27"
}
```

## Validation performed

- Parsed rebuilt HTML with BeautifulSoup.
- Verified required DOM anchors exist.
- Verified all 12 topic templates exist.
- Verified external CSS and JS files exist.
- Ran `node --check public/internal/setuflow-docs-workspace.js` successfully.

No `npm ci` was run.
