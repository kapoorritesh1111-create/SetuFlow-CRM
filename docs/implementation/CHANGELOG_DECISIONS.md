# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-10 — Sprint 7F Top inline event-scoped filter narrowing

Decision:

- Sprint 7F focused on the screenshot's top inline lead filter surface.
- The Source Event dropdown now scopes the available inline filter options for owner, stage, country, market, and product to values actually present in leads captured from the selected event.
- Clearing Source Event restores the full option lists.
- If a selected owner, stage, country, market, or product is not present in the selected event, that incompatible selection is cleared.
- The change is implemented as a small client helper mounted on the leads page, so the large leads workspace row/action model is not rewritten.
- Sprint 7E country/market data correctness and country-to-market behavior remain protected.
- Row click, **Open**, and **More** lead-row behavior remain unchanged.

Files:

- `src/features/leads/components/lead-event-filter-narrower.tsx`
- `src/app/(app)/leads/page.tsx`
- `docs/help/leads.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote PDF/share/send behavior was changed.
- No quote Review compliance behavior was changed.
- No Catalog Admin/import/product cleanup behavior was changed.
- No lead row **Open / More** behavior was changed.
- No Supabase schema or data migration was introduced.
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
- Row click, **Open**, and **More** lead-row behavior remain unchanged.

---

## 2026-05-10 — Sprint 7D Advanced lead filter density cleanup

Decision:

- Advanced lead filters panel was simplified into three calm sections: **Journey**, **Pipeline**, and **Commercial scope**.
- Repeated route-lock helper text under multiple fields was replaced with one clear route-lock note in the panel header.
- **Clear filters** remains visible in the panel header.
- Every existing filter field and callback is preserved.
- Row click, **Open**, and **More** lead-row behavior remain unchanged from Sprint 7C.

---

## 2026-05-10 — Sprint 7C Lead table smoke-check clarity

Decision:

- Row click and **Open** remain the primary paths into the Lead Command Center.
- The secondary action control is now labeled **More** instead of a bare ellipsis.
- The action column header now says **Open / More**.
- **More** still contains **Continue quote**, **Edit lead**, and **Delete lead**.
- The blocked row pill was shortened to **Blocked**.

---

## 2026-05-10 — Sprint 7B Lead list/table action cleanup

Decision:

- The row itself still opens the Lead Command Center.
- The visible row CTA is now only **Open**.
- Secondary actions moved into the compact More menu.
- Delete no longer competes as a visible inline lead-row CTA.

---

## 2026-05-10 — Sprint 7A Lead Command Center action hierarchy

Decision:

- The Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote** or **Create quote**.
- **Plan follow-up** and **Edit lead** remain visible as secondary actions.
- Won/Lost actions moved into a deliberate **Close lead outcome** area.
- The protected quote route remains `/leads` → open lead → **Continue quote** → **Step 4 — Review** for compliance/document blockers.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete.
- Sprint 7 is active.
