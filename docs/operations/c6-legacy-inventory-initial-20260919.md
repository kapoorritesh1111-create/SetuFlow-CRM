# C6 Legacy Route / File Inventory — Initial Evidence Pass

Date: 2026-09-19

This inventory is evidence-based. No deletion is approved solely from filenames.

## 1. public/internal — KEEP / CLASSIFY FILE-BY-FILE

Evidence:
- src/app/go-internal/page.tsx intentionally hard-navigates into static files under /public/internal.
- tests/docs-drift.test.mjs directly reads public/internal/setuflow-docs-workspace.js.
- docs/DOCUMENTATION_WORKSPACE.md and CURRENT_RELEASE_STATUS.md describe the internal docs workspace as current.
- docs/smc-rls-audit.md explicitly treats the static internal apps as an active security boundary.

Conclusion:
Do not delete public/internal wholesale.

### Active / keep
- public/internal/setuflow-docs.html
- public/internal/setuflow-docs-workspace.js and related current CSS/JS
- public/internal/products-price-list-workflow.html
- public/internal/design-system/style-guide.html
- current docs screenshot assets used by the docs workspace
- current roadmap/demo/docs assets referenced by present documentation/tests

### Archive candidate after reference/test update
- public/internal/catalog-price-list-qa.html

Evidence:
- docs/catalog-price-list-workflow-audit.md explicitly says its conceptual role was replaced by public/internal/products-price-list-workflow.html and it should remain only as a historical QA artifact.
- tests/dcc-alignment.test.mjs still lists it as a known static HTML page.

Action before removal:
1. update the test/static-page registry,
2. confirm no active internal navigation links point to it,
3. move to docs/archive or an external historical archive,
4. then delete the public route.

## 2. mitigation/ — KEEP FOR NOW

Evidence:
- README.md explicitly describes mitigation/ as retained DB investigation context.
- docs/DOCUMENT_INDEX.md indexes mitigation/README.md as retained context.
- scripts/check-migration-rollbacks.mjs actively scans mitigation/supabase/sql.
- mitigation/supabase/sql/ROLLBACK.md defines CI expectations for that directory.
- mitigation/supabase/sql/README_EXECUTION_ORDER.md calls the pack legacy but retained.

Conclusion:
Do not remove mitigation/ until CI and documentation are deliberately migrated away from it.

Recommended future cleanup:
- split truly historical SQL into a compressed/archive repository,
- move any still-required CI rollback fixtures to a dedicated test fixture location,
- update scripts/check-migration-rollbacks.mjs,
- update README/docs index,
- only then remove mitigation/.

## 3. lead legacy-actions.ts — ACTIVE / DO NOT DELETE

Path:
- src/features/leads/server/actions/legacy-actions.ts

Evidence:
- scripts/check-server-actions-type-safety.mjs directly includes this file.
- docs/implementation/sf-18-008-type-safety-plan.md states actions.ts is a small re-export and legacy-actions.ts is the active implementation target.
- current feature/docs references still point to functions implemented there.

Conclusion:
Refactor by domain later; do not delete.

## 4. /workspace naming — DO NOT TREAT AS LEGACY BY NAME

Evidence:
- src/app/api/workspace/* contains active APIs such as logo, favicon and agent routes.
- src/lib/workspace/* is the active auth/access helper namespace.
- current application pages import requireWorkspace/getWorkspaceAccess.

Conclusion:
The handoff's legacy concern applies to old compatibility UI routes, not every path containing "workspace".
Do not bulk-remove /api/workspace or src/lib/workspace.

## 5. Removed legacy surfaces already guarded by tests

Evidence:
- tests/mobile-route-contract.test.mjs asserts public/internal-dcc/index.html is absent.
- tests/dcc-alignment.test.mjs guards against removed reference paths being described as active.

Conclusion:
Some older static surfaces are already removed and regression-protected. Do not recreate them.

## C6 current classification

KEEP:
- active internal docs workspace
- active /api/workspace APIs
- src/lib/workspace auth helpers
- mitigation/ while CI references it
- legacy-actions.ts while active

ARCHIVED FROM PUBLIC SURFACE:
- public/internal/catalog-price-list-qa.html → docs/archive/catalog-price-list-qa.html
- public/internal/catalog-workflow-repair-map.html → docs/archive/catalog-workflow-repair-map.html
- public/internal/lead-capture-intro-behavior.html → docs/archive/lead-capture-intro-behavior.html
- public/internal/trade-show-trial-preview-policy.html → docs/archive/trade-show-trial-preview-policy.html (canonical Markdown policy retained)

NEXT INVENTORY TARGETS:
- other public/internal prototypes that may have been superseded
- old quote/order compatibility components
- old Pricing review assets not referenced by the active V5 owner-review flow
- archived handoff/fix-report volume that can move out of everyday code search


## Quote / Lead / Order compatibility audit

### Already removed
The following historical implementation modules referenced by the SF-18-007 decomposition document no longer exist on current main:
- src/features/quotes/components/wizard/quote-wizard-form.legacy.tsx
- src/features/leads/components/drawer/lead-drawer.legacy.tsx
- src/features/leads/components/workspace/leads-workspace.legacy.tsx

These should be treated as already-cleaned history, not future deletion targets.

### Current Lead workspace — KEEP
- src/features/leads/components/leads-workspace.tsx is a thin re-export of workspace/leads-workspace-implementation.
- src/features/leads/components/lead-drawer.tsx wraps and re-exports drawer/lead-drawer-implementation.
- /leads mounts LeadsWorkspace.
- mobile/trade-event tests explicitly assert LeadsWorkspace and LeadDrawer behavior.

Conclusion:
These are canonical active paths despite historical "legacy" decomposition documentation.

### Orders — current active route is already canonical
- src/app/(app)/orders/page.tsx intentionally returns null because the cockpit is rendered by layout.tsx.
- layout.tsx mounts the current responsive Orders workspace and MobileOrdersWorkspace.
- help docs state the deprecated legacy Orders workspace is not the active workflow.

Conclusion:
Do not remove current orders components. The legacy workspace is already excluded from mounting; further code deletion requires identifying a physical unreferenced file first.

### Docs workspace — KEEP
- setuflow-docs-current-updates.html is intentionally linked from the live product-docs rail as "Archived update view".
- setuflow-docs-premium-20260827.js and setuflow-docs-product-docs-v2.js are directly loaded by setuflow-docs.html.

Conclusion:
Do not archive/remove these versioned docs assets merely because their filenames contain dates.


## C6 Batch 2 additional removals
Archived from public/prototypes because they are standalone review/demo mockups with no current repository consumers:
- public/prototypes/trade-show-trial.html
- public/prototypes/trade-show-mobile-preview.html
- public/prototypes/trade-show-trial-premium.css

Archive location:
- docs/archive/trade-show-trial-prototypes/

Removed:
- public/setuflow-client-docs.html (empty file, no repository consumers)

Held:
- public/setuflow-trade-show-trial.html — no repo consumers, but may be an externally shared direct URL.
- public/vendor/investor_demo_v5.html — no repo consumers, but may be an externally shared direct URL.

These held files require traffic/external-link evidence before retirement.
