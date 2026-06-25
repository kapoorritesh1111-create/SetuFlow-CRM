# FIX — Lead Detail interactivity + quote open gate

Two issues reported after the premium Lead Detail shipped:

## 1. Lead Detail was display-only (couldn't edit / qualify / set follow-up)
`LeadDetailPremium` had no actions, so a lead could not be moved forward. Added
`src/features/leads/lead-detail/LeadDetailActionBar.tsx` (client) into the header:
- **Edit Lead** → opens the existing full `LeadDrawer` (basics).
- **Qualify & Map** (shown until qualified) → opens the drawer at the `workflow` (qualification) step,
  which also covers product/market coverage — this is what clears the new-quote gate.
- **Schedule Follow-up** → inline datetime → `scheduleLeadFollowUp` server action.
- Share / Create-or-Open Quote remain navigations; the primary quote button now auto-labels
  "Open Current Quote" vs "Create Quote" based on whether a quote exists.
All drawer props are sourced from the route's existing `getLeadProfileData`; on save/schedule the page
calls `router.refresh()`.

## 2. Every quote opened to "Qualification required" — even existing/accepted quotes
The quote route gated **all** access on `qualificationStatus === 'qualified'`, so an existing quote
(e.g. Setu Groups = accepted, Test Lead = in_review) could never be opened. Fixed in
`src/app/(app)/leads/[leadId]/quote/page.tsx`: the qualification + product-mapping gates now apply
only when the lead has **no** quote yet (first-quote creation). If a quote already exists, the workspace
opens normally. New-quote creation for unqualified leads is still gated server-side by
`app_create_lead_quote_draft_tx`, so the integrity guarantee is unchanged.

Validation: `tsc --noEmit` = 0 errors. Confirmed against live data that both screenshot leads have an
existing quote, so both now open instead of showing the wall.
