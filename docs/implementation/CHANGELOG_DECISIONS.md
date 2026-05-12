# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-12 — Sprint 8Q quote version integrity and Orders lineage

Decision:

- `quote_versions` and `quote_version_line_items` are the commercial quote source of truth.
- Parent `quotes` remains a workflow shell and summary record.
- Sending a quote does not mean acceptance.
- `accepted_version_id` changes only on explicit acceptance, not on send.
- Sent, approved, accepted, rejected, expired, and order-source quote versions are immutable commercial records.
- Editing a sent/customer-facing quote must create a new version with new version line items.
- Orders must start from the explicitly accepted quote version and preserve `orders.source_quote_id` plus `orders.source_quote_version_id`.
- Lead compliance remains active for lead/quote readiness, but order execution blockers move to order-stage `trade_requirements` scoped to order, stage, product/category, country, shipment mode, Incoterm, and buyer/bank requirement.

Files:

- `src/lib/quoteWorkflow.ts`
- `supabase/migrations/20260512_sprint_8q_quote_version_integrity.sql`
- `docs/help/quotes.md`
- `tests/quote-version-integrity.test.mjs`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- Avanti Foods Limited data was not touched.
- Quote PDF/share/send protections remain protected.
- Quote Review compliance remains protected.
- Catalog Admin/import/product cleanup remains protected.
- Lead row **Open / More** remains protected.
- Lead compliance was not deleted; it was clarified as lead/quote readiness, not order execution stage gating.

---

## 2026-05-10 — Dashboard Map UX country auto-focus

Decision:

- Dashboard world coverage map now auto-focuses when a country filter is selected.
- The selected country remains highlighted and the map pans/zooms to show that country in focus.
- Clearing the country filter resets the map to the full world view.
- Manual zoom, pan, and Reset controls remain available after auto-focus.
- Dashboard help and Setu Guru page context now explain country focus and reset behavior.

Files:

- `src/features/dashboard/lib/map-interactions.ts`
- `src/features/dashboard/hooks/use-world-map-controls.ts`
- `src/features/dashboard/components/world-coverage-map.tsx`
- `docs/help/dashboard.md`
- `src/lib/setu-guru/page-context.ts`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote PDF/share/send behavior was changed.
- No quote Review compliance behavior was changed.
- No Catalog Admin/import/product cleanup behavior was changed.
- No lead row **Open / More** behavior was changed.
- No schema migration was introduced.
- No `npm ci` was run.

---

## 2026-05-10 — Sprint 7E Connected lead filters and country-market correction

Decision:

- Sprint 7E addressed the production screenshot showing dense filters and a country/market mismatch.
- Supabase production data was corrected so European country rows map to the Europe market.
- Avanti Foods Limited default country/default market pairing was corrected from Ireland/North America to Ireland/Europe.
- A tracked SQL migration was added for the country-market correction.
- New workspace provisioning now copies country rows into the matching market by market name instead of assigning all copied countries to the first/fallback market.
- Advanced lead filters now keep Country and Market connected.

---

## 2026-05-10 — Sprint 7D Advanced lead filter density cleanup

Decision:

- Advanced lead filters panel was simplified into three calm sections: **Journey**, **Pipeline**, and **Commercial scope**.
- Repeated route-lock helper text under multiple fields was replaced with one clear route-lock note in the panel header.
- Every existing filter field and callback is preserved.

---

## 2026-05-10 — Sprint 7C Lead table smoke-check clarity

Decision:

- Row click and **Open** remain the primary paths into the Lead Command Center.
- The secondary action control is now labeled **More** instead of a bare ellipsis.
- The action column header now says **Open / More**.

---

## 2026-05-10 — Sprint 7B Lead list/table action cleanup

Decision:

- Lead list row action density was reduced.
- The visible row CTA is now only **Open**.
- Secondary actions moved into the compact More menu.

---

## 2026-05-10 — Sprint 7A Lead Command Center action hierarchy

Decision:

- The Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote** or **Create quote**.
- **Plan follow-up** and **Edit lead** remain visible as secondary actions.
- Won/Lost actions moved into a deliberate **Close lead outcome** area.

---

## Operating rules retained

- Ask approval before GitHub writes unless the current prompt explicitly approves the pass.
- Prefer one final commit per approved pass where tooling allows it.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, Sprint 7, and Sprint 10 are 100% complete.
- Sprint 8 is active.
