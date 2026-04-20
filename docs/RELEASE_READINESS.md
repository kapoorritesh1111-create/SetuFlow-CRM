# Release Readiness Checklist

## Current repo truth
- PR-01 through PR-10 are complete.
- Legacy development, workspace mirror, preview, and planning surfaces remain removed.
- Root build and typecheck artifact files remain removed.
- Canonical route truth is driven by `src/lib/routes/manifest.json`.
- The internal DCC at `public/internal-dcc/index.html` remains the internal planning and readiness source of truth.

## Release checklist

### Product truth
- [x] Canonical routes only
- [x] Pipeline remains a core route
- [x] Quotes opens as a real workspace
- [x] Dashboard is action-first
- [x] Trade workflow signals are explicit
- [x] AI scoring is workflow-aware
- [x] Integrations expose connector architecture and mock connectors

### Repo hygiene
- [x] Development surfaces removed
- [x] Workspace mirror removed
- [x] Preview surfaces removed
- [x] Planning surfaces removed from shipped app
- [x] Root artifact files removed

### Documentation
- [x] Root README added
- [x] Buyer demo script added
- [x] Trade-show script added
- [x] Workflow diagram added
- [x] Architecture diagram added
- [x] Release checklist updated

### Verification
- [x] Route-presence test passes
- [ ] Fresh install proof
- [ ] Fresh typecheck proof in a fully provisioned environment
- [ ] Fresh production build proof in a fully provisioned environment

## Notes
The DCC should be refreshed whenever repo truth changes. Product-facing docs should remain customer-safe and should not be replaced by internal-only planning content.
