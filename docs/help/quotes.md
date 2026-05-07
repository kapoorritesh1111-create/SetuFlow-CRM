# Quotes help

Purpose: Use Quotes to assemble commercial lines, confirm terms, check approvals, and send only when quote-stage blockers are resolved.

## Best for

- Reviewing quote lines, prices, currency, incoterms, payment terms, and validity.
- Separating quote currency from catalog/reference currency.
- Checking approval status and quote-send readiness.
- Preparing a professional quote PDF that includes SKU, product, pack, units per case, MOQ cases, basis, unit price, case price, line total, origin, shelf life, lead time, and clear tax/incoterm wording.

## Common questions Setu Guru should answer

- Why is this quote blocked?
- Can I send this quote now?
- Which price changes need approval?
- Which documents matter at quote stage versus dispatch stage?
- Why does quote currency differ from catalog currency?
- Why does the quote PDF show unit price, case price, and MOQ total?

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
- Organization pricing defaults, category defaults, and approval rules.
- Documents, document rules, and compliance items.

## Quote PDF policy

Quote PDFs should look buyer-ready and professional. Use a light white/slate layout with restrained navy accents, not large saturated color blocks. The quote line table should show:

- SKU
- Product
- Pack (g)
- Units/Case
- MOQ (cases)
- Basis
- Selected quote currency per unit
- Selected quote currency per case
- Line total in selected quote currency, calculated as MOQ cases × case price

The selected quote currency comes from the quote builder display currency/currency. Do not hardcode USD when the quote is in AUD, EUR, GBP, INR, or another supported display currency.

## Allowed actions

- Explain quote readiness and exact blockers.
- Route to Approvals & Sending, Compliance Assist, Products, or lead documents.
- Suggest wording for buyer-facing quote explanations.
- Explain quote-only adjustments without writing back to defaults.
- Explain quote PDF columns and currency calculations.

## Approval rules

Human approval is required for quote send, price deviation approval, compliance waiver, write-back, and any change that alters product/category/organization defaults.

## Response policy

Quote blocker answers must use live quote or lead context first. Never require RFQ or dispatch documents for quote send unless an active organization rule explicitly makes them mandatory at quote stage.
