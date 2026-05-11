# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-10 — Sprint 7E Connected lead filters and country-market correction

Decision:

- Sprint 7E addressed the production screenshot showing dense filters and a country/market mismatch.
- Supabase production data was corrected so European country rows map to the Europe market.
- Avanti Foods Limited default country/default market pairing was corrected from Ireland/North America to Ireland/Europe.
- A tracked SQL migration was added for the country-market correction.
- New workspace provisioning now copies country rows into the matching market by market name instead of assigning all copied countries to the first/fallback market.
- Advanced lead filters now keep Country and Market connected:
  - selecting a country also selects that country's market;
  - selecting a market narrows the country dropdown to countries in that market;
  - changing the market clears an incompatible selected country.
- Row click, **Open**, and **More** lead-row behavior remain unchanged.
- Top inline event-scoped option narrowing is intentionally left for the next pass because the screenshot shows that surface separately from the advanced panel and it should be inspected after this deployment.

Files:

- `src/features/client-onboarding/server/provisioning.ts`
- `src/features/leads/components/LeadsFiltersPanel.tsx`
- `mitigation/supabase/sql/130_sprint_7e_correct_country_market_mappings.sql`
- `docs/help/leads.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote PDF/share/send behavior was changed.
- No quote Review compliance behavior was changed.
- No Catalog Admin/import/product cleanup behavior was changed.
- No lead row **Open / More** behavior was changed.
- No schema shape migration was introduced; this pass applied a data correction only.
- No `npm ci` was run.

---

## 2026-05-10 — Sprint 7D Advanced lead filter density cleanup

Decision:

- Lead workspace visual cleanup continued after Sprint 7C row smoke-check.
- Advanced lead filters panel was simplified into three calm sections: **Journey**, **Pipeline**, and **Commercial scope**.
- Repeated route-lock helper text under multiple fields was replaced with one clear route-lock note in the panel header.
- **Clear filters** remains visible in the panel header.
- Every existing filter field and callback is preserved: lead type, owner, pipeline, stage, country, market, and product.
- Row click, **Open**, and **More** lead-row behavior remain unchanged from Sprint 7C.
- Setu Guru lead help now explains when to use filters vs opening the lead row.

---

## 2026-05-10 — Sprint 7C Lead table smoke-check clarity

Decision:

- Lead table smoke-check target was made clearer while protecting the Sprint 7B row model.
- Row click and **Open** remain the primary paths into the Lead Command Center.
- The secondary action control is now labeled **More** instead of a bare ellipsis.
- The action column header now says **Open / More**.
- **More** still contains **Continue quote**, **Edit lead**, and **Delete lead**.
- The blocked row pill was shortened to **Blocked** to reduce row density without changing compliance or blocker source-of-truth behavior.
- Setu Guru lead help now explains the **Open / More** lead row model.

---

## 2026-05-10 — Sprint 7B Lead list/table action cleanup

Decision:

- Lead list row action density was reduced.
- The row itself still opens the Lead Command Center.
- The visible row CTA is now only **Open**.
- Secondary actions moved into the compact More menu:
  - **Continue quote**;
  - **Edit lead**;
  - **Delete lead**.
- Delete no longer competes as a visible inline lead-row CTA.
- Lead table action column width was reduced to reflect the cleaner action model.

---

## 2026-05-10 — Sprint 7A Lead Command Center action hierarchy

Decision:

- Sprint 7 Lead command center cleanup is active.
- The Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote** or **Create quote**.
- **Plan follow-up** and **Edit lead** remain visible as secondary actions.
- Won/Lost actions moved into a deliberate **Close lead outcome** area so terminal status changes do not compete with quote continuation.
- The protected quote route remains `/leads` → open lead → **Continue quote** → **Step 4 — Review** for compliance/document blockers.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete.
- Sprint 7 is active.
