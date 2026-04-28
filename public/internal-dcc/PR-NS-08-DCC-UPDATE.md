# PR-NS-08 - Catalog-to-Quote Data Wiring Hardening

## What changed
- Quote fallback updates now create a new immutable `quote_versions` row and matching `quote_version_line_items` snapshot instead of overwriting prior versions.
- Live `quote_line_items` remain the current editable quote body while `quotes.current_version_id` points to the latest stored snapshot.
- Quote revisions record an audit-style event in `quote_negotiation_events` with prior version id and new version number.
- Pipeline drag/drop now applies an optimistic stage move, rolls back local state on Supabase failure, and refreshes after commit.
- Added order document upload server action that writes to Supabase Storage, creates `documents` metadata, audits the action, and revalidates execution surfaces.

## What was fixed
- Previous quote version snapshots are no longer overwritten in direct fallback mode.
- Approval/version status resolves to persisted states: `draft`, `sent`, `approved`, `rejected`, `expired`, or `approval_pending`.
- Pipeline drag/drop has backend sync safety and refresh-after-commit behavior.
- Order documents can be linked to contract/order records and participate in existing readiness computation.

## What remains
- Live Supabase validation is still required for the `order-documents` storage bucket and policies.
- Local build/typecheck could not be completed because the uploaded repository did not include `node_modules` and `npm ci` did not complete in this execution environment before timeout.

## Data flow diagram
```text
Catalog product + variant + pricing
  -> Quote drawer/wizard draft state
  -> quote_line_items current editable rows
  -> quote_versions immutable v1/v2/v3 snapshot
  -> quote_version_line_items immutable line snapshot
  -> approval/send state + audit/negotiation events
  -> accepted quote / contract handoff
  -> contracts + contract_line_items
  -> documents + compliance checklist + dispatch artifacts
  -> computed order execution/dispatch state

Pipeline lead card
  -> optimistic drag/drop stage change
  -> moveLeadToStage server action
  -> leads.stage_id + lead_stage_history + lead_activities
  -> UI refresh confirms persisted grouping after commit
```

## Validation checklist
- [x] Source patch applied to current uploaded repo.
- [x] Quote fallback version snapshots made immutable.
- [x] Pipeline drag/drop persistence safety added.
- [x] Order document storage + metadata action added.
- [ ] `npm run build` passes - blocked by dependency install timeout in this environment.
- [ ] No TypeScript errors - not fully verifiable without dependencies.
- [ ] No console runtime errors - requires browser/live Supabase validation.
- [ ] Supabase writes confirmed - code paths write through Supabase; live project confirmation required.
- [ ] Drag/drop persists after refresh - code refreshes after commit; live project confirmation required.
- [ ] Quote versions stored correctly - fallback inserts immutable versions; live project confirmation required.
- [ ] Order docs persist and affect state - action persists metadata; live project confirmation required.
- [ ] Catalog selections persist into quotes - existing create/update quote paths persist current line items; live project confirmation required.
