# SETU Flow Do Not Regress Guardrails

This file lists fixes and behaviors that must be protected during every future pass.

---

## Build and deployment

- Production Vercel build must remain green.
- Always check latest Vercel deployment after repo changes.
- If build fails, fix the build before starting new feature work.
- Do not run `npm ci` in the sandbox environment.

---

## Authentication and workspace

- Login must continue working.
- Workspace role and organization context must continue loading.
- Do not break organization-scoped Supabase queries or RLS expectations.
- Do not expose cross-organization data.

---

## Setu Guru

- Setu Guru input must not lose focus after every typed letter.
- Setu Guru answer area must scroll to the latest answer.
- Setu Guru suggested buttons must navigate or trigger a meaningful action.
- Setu Guru should not answer generic workflow text when live page/entity context is available.
- Setu Guru must route compliance/blocker/document questions through live org/context logic.
- Setu Guru must clearly distinguish:
  - advisory guidance
  - required blockers
  - human approval actions
  - live web research suggestions
- Setu Guru must not approve, waive, write back, send, delete, or clear compliance without explicit user/human approval.

---

## Quote builder and quote PDF

- AUD and other supported display currencies must save without Supabase check constraint failures.
- Quote PDF must show product/variant details when present:
  - pack size
  - units per case
  - MOQ
  - country of origin
  - shelf life
  - lead time
- Quote PDF tax wording must avoid confusing zero-rated/exempt language.
- Quote PDF must use clearer Incoterm/buyer responsibility wording.
- Quote builder must not treat RFQ as required for quote creation unless explicitly configured.
- Advisory documents such as COA and Packing List must not block quote send by default.
- Quote-only price changes must not rewrite product/category/org defaults.
- Buyer quote currency and catalog/reference currency must not be displayed in a confusing way.

---

## Compliance

- COA and Packing List are currently advisory before dispatch/order execution for the main org, not mandatory quote-send blockers.
- Compliance Assist must remain available at `/compliance/assist?leadId=<lead-id>`.
- Quote prep and lead right rail should route users to Compliance Assist for evidence/waiver workflows.
- True mandatory blockers must explain what is blocking and how to fix it.
- Waivers must require a reason and appropriate permission.
- Compliance/document status changes must be audited where possible.

---

## Products and pricing

- Product edit drawer should remain wide, calm, and premium.
- Product pricing tab should keep:
  - saved pricing snapshot
  - pricing health header
  - essential inputs first
  - advanced cost sections collapsed
  - live result card
- Product pricing save should remain product-default oriented.
- Quote-specific pricing changes must remain in quote workspace.
- Product drawer must still support overview, pricing, variants, trade, and history tabs.

---

## Organization setup

- Organization default market/currency should be based on country where available.
- Organization setup must support address/default country information.
- Organization slug/name changes should not force unwanted hyphens in user-facing org URL setup.
- Help text should look like help text, not pre-filled test data.

---

## Data integrity

- Do not seed fake data over real organization data unless explicitly requested.
- If data appears missing, run a sanity check before seeding.
- Product catalog data for the main org has previously shown pack, MOQ, origin, shelf life, and lead time present; do not assume missing data without querying.

---

## UI quality

- Avoid dense/dev-heavy panels.
- Prefer lightweight cards, status pills, action rows, and collapsible advanced sections.
- Avoid highlighted placeholder/help text that looks like filled data.
- Keep user-facing language business-friendly and simple.
- Put technical/dev notes in docs and Setu Guru knowledge, not screen UI.
