# Sprint 41 Supplier Workflow - PR 1 Implementation Note

## Source of truth

The requested source package is `setu_flow_supplier_workflow_sprint41_implementation_package_v2.docx`, with rendered PDF reference `supplier_impl_render_v2/setu_flow_supplier_workflow_sprint41_implementation_package_v2.pdf`.

I searched the repository for the package filename and the approved visual reference names. The package files were not present in the current GitHub repository index at the start of PR 1, so this PR follows the Sprint 41 implementation scope supplied in the handoff message.

## PR 1 scope

Issues targeted:

- S41-SUP-001 - centralized mode parsing and mode-to-lead-type mapping
- S41-SUP-002 - supplier mode drives create defaults
- S41-SUP-003 - Quick Lead Save & New keeps supplier context
- S41-SUP-004 - server save guard prevents silent supplier-to-buyer fallback

## Changes made

- Hardened `parseWorkspaceMode` to normalize case and whitespace.
- Added `assertLeadTypeMatchesMode` for server/action guard usage.
- Updated Quick Lead wrapper so `/leads?mode=suppliers` seeds a supplier lead instead of relying on the drawer's buyer default.
- Updated Quick Lead Save & New behavior so it keeps the drawer open and preserves the seeded buyer/supplier mode.
- Added a server save guard before the legacy save action so missing `lead_type` is blocked instead of silently falling back to buyer.
- Added focused Sprint 41 mode regression tests for buyer/supplier/all mode mapping and mismatch rejection.

## Follow-up needed in later PRs

- Wire supplier mode through any remaining mobile/offline/contact-scan entry paths that submit independent form payloads.
- Add Playwright coverage for `/leads?mode=suppliers`, Save & New, contact scan, and offline capture.
- Update `public.sprint_issues` issue rows as each PR moves through review, merge, deployment, and production verification.
