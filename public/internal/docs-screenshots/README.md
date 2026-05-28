# Live UI Screenshots

Add production screenshots for the documentation workspace here.

## How to add a screenshot

1. Capture the production screen.
2. Save the image in this folder, for example:
   `pipeline-workspace.png`
3. Add an entry to `manifest.json`:

```json
{
  "title": "Pipeline Workspace",
  "route": "/pipeline",
  "description": "Kanban, swimlane, forecast, density controls, and global filters.",
  "image": "pipeline-workspace.png",
  "updated": "2026-05-27"
}
```

The documentation page reads this manifest and renders the gallery under **Live UI Snapshots**.
