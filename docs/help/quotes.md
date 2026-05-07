# Quotes help

Purpose: Use Quotes to assemble commercial lines, confirm terms, check approvals, and send only when quote-stage blockers are resolved.

## Best for

- Reviewing quote lines, prices, currency, incoterms, payment terms, and validity.
- Separating quote currency from catalog/reference currency.
- Checking approval status and quote-send readiness.
- Preparing a professional quote PDF that includes SKU, product, pack, units per case, MOQ cases, basis, unit price, case price, line total, origin, shelf life, lead time, seller address, tax ID, and clear tax/incoterm wording.

## Common questions Setu Guru should answer

- Why is this quote blocked?
- Can I send this quote now?
- Which price changes need approval?
- Which documents matter at quote stage versus dispatch stage?
- Why does quote currency differ from catalog currency?
- Why does the quote PDF show unit price, case price, and MOQ total?
- Which quote builder step should I use next?

## Common blockers

- Missing buyer, country, currency, incoterm, validity, or payment terms.
- Quote line missing product, quantity, unit, pack, MOQ, or price.
- Price deviation exceeds approval threshold.
- Mandatory quote-send compliance rule is open.
- Advisory dispatch document is being mistaken for a quote-send blocker.

## Data sources

- Quote header and quote lines.
- Lead and lead product interests.
- Product catalog rows and variants.
- Organization profile fields: legal name, registered address, city, postal code, country, website, contact email, and tax ID.
- Organization pricing defaults, category defaults, and approval rules.
- Documents, document rules, and compliance items.

## Quote builder action clarity

Keep one primary quote builder sequence instead of adding duplicate quote action panels. The sequence is:

**Product & currency → Price lines → Terms & approval → Review totals → Send checkpoint**

Use each step for a clear business decision:

- **Product & currency** anchors buyer context, product scope, pricing basis, and selected quote currency.
- **Price lines** reviews pack, MOQ, units/case, basis price, quote price, and line total in one table.
- **Terms & approval** records workflow status, approval posture, and internal notes.
- **Review totals** confirms selected currency, quote-only overrides, totals, and approval state before customer movement.
- **Send checkpoint** handles blockers, approvals, revisions, and customer-send decisions through the existing send controls.

Do not add duplicate quote action panels when an action already exists inside the builder sequence, send checkpoint, PDF route, or approval controls. Setu Guru should point the user to the next builder step rather than creating parallel actions.

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
- Route to the right quote builder step, Approvals & Sending, Compliance Assist, Products, or lead documents.
- Suggest wording for buyer-facing quote explanations.
- Explain quote-only adjustments without writing back to defaults.
- Explain quote PDF columns and currency calculations.

## Approval rules

Human approval is required for quote send, price deviation approval, compliance waiver, write-back, and any change that alters product/category/organization defaults.

## Response policy

Quote blocker answers must use live quote or lead context first. Never require RFQ or dispatch documents for quote send unless an active organization rule explicitly makes them mandatory at quote stage. For quote-builder questions, answer with the next step in the builder sequence and avoid recommending duplicate action surfaces.
