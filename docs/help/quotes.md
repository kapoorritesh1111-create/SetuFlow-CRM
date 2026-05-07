# Quotes help

Purpose: Use Quotes to assemble commercial lines, confirm terms, check approvals, and send only when quote-stage blockers are resolved.

## Best for

- Reviewing quote lines, prices, currency, incoterms, payment terms, and validity.
- Separating quote currency from catalog/reference currency.
- Checking approval status and quote-send readiness.
- Preparing a professional quote PDF that includes SKU, product, pack, units per case, MOQ cases, basis, unit price, case price, line total, origin, shelf life, lead time, seller address, tax ID, and clear tax/incoterm wording.
- Sharing buyer-facing quote links through production-domain quote share pages.

## Common questions Setu Guru should answer

- Why is this quote blocked?
- Can I send this quote now?
- Which price changes need approval?
- Which documents matter at quote stage versus dispatch stage?
- Why does quote currency differ from catalog currency?
- Why does the quote PDF show unit price, case price, and MOQ total?
- Which quote builder step should I use next?
- Why should quote share links use the production domain?

## Common blockers

- Missing buyer, country, currency, incoterm, validity, or payment terms.
- Quote line missing product, quantity, unit, pack, MOQ, or price.
- Price deviation exceeds approval threshold.
- Mandatory quote-send compliance rule is open.
- Advisory dispatch document is being mistaken for a quote-send blocker.
- Quote share link is still a preview/dev URL or raw JSON placeholder instead of a buyer-facing page.
- Quote share page lacks organization branding/logo when organization profile has a logo.

## Data sources

- Quote header and quote lines.
- Lead and lead product interests.
- Product catalog rows and variants.
- Organization profile fields: legal name, registered address, city, postal code, country, website, contact email, logo URL, and tax ID.
- Organization pricing defaults, category defaults, and approval rules.
- Documents, document rules, and compliance items.

## Quote builder action clarity

Keep one primary quote builder sequence instead of adding duplicate quote action panels. The sequence is:

**Product & currency → Price lines → Terms & approval → Review totals → Send & approval checkpoint**

Use each step for a clear business decision:

- **Product & currency** anchors buyer context, product scope, pricing basis, and selected quote currency.
- **Price lines** reviews pack, MOQ, units/case, basis price, quote price, and line total in one table.
- **Terms & approval** records workflow status, approval posture, and internal notes. Approval posture must be explicit before customer movement.
- **Review totals** confirms selected currency, quote-only overrides, totals, approval state, and PDF readiness before generating or sending.
- **Send & approval checkpoint** handles blockers, approval status, revisions, and customer-send decisions through the existing send controls.

Do not add duplicate quote action panels when an action already exists inside the builder sequence, send checkpoint, PDF route, or approval controls. Setu Guru should point the user to the next builder step rather than creating parallel actions.

## Send and approval policy

Send only when approval is approved or not required, the quote has no active send blockers, and the operator intentionally chooses the existing send checkpoint. If approval is pending, route to the approval action first. If blockers are active, explain the blocker and route to the matching builder step or Compliance Assist. Do not create parallel send buttons, quick-send shortcuts, or hidden write-back actions.

## Quote share policy

Quote share links must be buyer-facing and professional:

- Use production-domain quote share links from `https://www.setuflowcrm.com`.
- Do not expose Vercel preview URLs in WhatsApp/customer messages.
- Do not show raw JSON to the buyer.
- The share route should open a branded quote summary with organization logo when available and a clear **Open quote PDF** action.
- If organization logo is missing or unsafe, show a clean fallback mark rather than broken image UI.
- WhatsApp messages should use polished buyer wording: quote number, product summary, selected-currency total, validity, and production quote link.
- Keep share flow inside the existing send/checkpoint flow; do not add duplicate quote action surfaces.

## Quote PDF policy

Quote PDFs should look buyer-ready and professional. Use a light white/slate layout with restrained navy accents, not large saturated color blocks. The quote line table should show:

- SKU
- Product
- Pack (g)
- Units/Case
- MOQ cases
- Basis
- Selected quote currency per unit
- Selected quote currency per case
- Line total in selected quote currency, calculated as MOQ cases × case price

The selected quote currency comes from the quote builder display currency/currency. Do not hardcode USD when the quote is in AUD, EUR, GBP, INR, or another supported display currency.

For price-list style exports, treat the quote line price as the case price when the commercial quote is built per case, derive unit price from case price ÷ units per case, and use MOQ cases × case price for the line total. Use catalog pack, units-per-case, and MOQ values first. If older quote/catalog records are sparse, use safe catalog/SKU fallback values rather than leaving buyer-facing pack and case fields blank.

Seller information should include legal name, registered address, city/postal code/country, contact email, website when space allows, and tax ID. Keep the PDF compact enough to avoid large whitespace gaps between commercial sections.

## Allowed actions

- Explain quote readiness and exact blockers.
- Route to the right quote builder step, existing send checkpoint, Approvals & Sending, Compliance Assist, Products, or lead documents.
- Suggest wording for buyer-facing quote explanations.
- Explain quote-only adjustments without writing back to defaults.
- Explain quote PDF columns and currency calculations.
- Explain quote share links, organization-logo branding, and why production-domain buyer pages are required.

## Approval rules

Human approval is required for quote send, price deviation approval, compliance waiver, write-back, and any change that alters product/category/organization defaults.

## Response policy

Quote blocker answers must use live quote or lead context first. Never require RFQ or dispatch documents for quote send unless an active organization rule explicitly makes them mandatory at quote stage. For quote-builder questions, answer with the next step in the builder sequence and avoid recommending duplicate action surfaces. For send questions, state whether approval is approved/not required, pending, or blocked, then route through the existing send checkpoint. For share-link questions, require production-domain buyer-facing pages with organization branding where available and reject raw JSON/preview-link behavior.
