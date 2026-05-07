# Products help

Purpose: Use Products as the operating catalog. Products should be quote-ready, easy to edit, and clear about product defaults versus quote-specific pricing.

## Best for

- Managing product rows, variants, trade details, and pricing snapshots.
- Reviewing quote-ready fields before sales activity.
- Finding products missing HSN/HS code, pack, MOQ, origin, shelf life, lead time, or pricing assumptions.
- Keeping product defaults separate from quote-only commercial changes.

## Common questions Setu Guru should answer

- Which products are missing HSN or quote-ready data?
- What do I need before this product can be quoted?
- Should this price change be product default or quote-only?
- How should I prepare product data for an export quote?

## Common blockers

- Missing HSN/HS code.
- Missing pack size, units per case, MOQ, origin, shelf life, or lead time.
- Missing category or inactive category.
- Pricing defaults are inherited but not reviewed.
- User is trying to use a quote-specific discount to update product master pricing.

## Data sources

- Product rows, variants, categories, pricing snapshots, and product metadata.
- Category pricing defaults and organization pricing defaults.
- Lead product interests and quotes using the product.
- Document requirement rules when product and destination matter.

## Sprint 4 catalog action clarity

Setu Guru should make the Products area feel action-led, not generic. Use these routes clearly:

- **Open Products** for daily product editing, product rows, variants, trade details, and product-specific pricing snapshots.
- **Check catalog readiness** for product gaps such as missing HSN, pack, MOQ, origin, shelf life, lead time, category, or pricing assumptions.
- **Open Product Management** for governance, imports, category defaults, organization defaults, setup health, approval posture, and audit review.
- **Ask live research** for HSN/HS code, duties/tariffs, document requirements, and margin benchmark questions.

## Products workspace control surface

The Products workspace should use one primary control surface only. Avoid duplicate work surfaces that repeat actions already available in the catalog header, category chips, pricing-gap chip, quote-ready chip, filters, pricing calculator, quote handoff, and Add product controls.

Keep the lower catalog controls as the primary action area:

- **Products / Pricing view / Spreadsheet** tabs.
- **Category chips** for All products and product categories.
- **Pricing gaps** and **Quote-ready** status chips.
- **Search, category, pricing mode, gaps, status, and quote-ready filters**.
- **Pricing calculator**, **Quote handoff**, and **Add product** header actions.

Do not add help-style or development-style explanations on the product screen. Keep explanatory policy here in docs and in Setu Guru responses.

## Product drawer guidance

The product detail drawer must remain wide, calm, and tab-led. Product screens should show concise business UI only. Setu Guru can explain each tab boundary in chat, but the drawer should not display long help text.

- **Overview** changes product identity, brand, description, status, and master data confidence.
- **Pricing** changes product-default assumptions and saved calculator snapshots for future quotes.
- **Variants** reviews SKU, pack, MOQ, and quote-ready status.
- **Trade** routes downstream to quick quote, leads, pipeline, or quotes only when product readiness supports the handoff.
- **History** reviews saved catalog posture and does not perform write-back actions.

When users ask “where should I change this?”, Setu Guru should answer using the drawer boundary first: product defaults in Products, governed defaults in Product Management, and customer-specific terms in Quotes.

## Product Management action rows

Product Management is an admin workbench. Action rows should tell users whether the next step belongs in Products, Product Management, or Quotes:

- Pricing-gap rows should open Products and remind users that quote-only discounts stay inside Quotes.
- Variant setup rows should open Products because variants are edited in the operating catalog.
- Trade-attribute rows should open Products for edits and Setu Guru live research for HSN review.
- Import rows should stay inside Product Management.
- Approval-posture rows should monitor governed rows and avoid automatic write-back.

## Sprint 4 closure rules

Sprint 4 is complete. Future product passes must preserve:

1. Product-default changes in Products.
2. Governed category/organization defaults in Product Management.
3. Customer-specific discounts and one-off commercial terms in Quotes.
4. Human approval before saved product/category/organization default changes.
5. No long help/development text on product screens or drawers.
6. Setu Guru explains product policy in chat, not inside product UI panels.
7. No duplicate shortcut/action panels when the same action already exists in the primary control area.

## Product default boundary

- Product-default changes belong in Products only when they should affect future quotes.
- Category and organization defaults belong in Product Management or Admin setup.
- Quote-only price changes, discounts, and customer-specific commercial terms stay inside the quote workspace.
- Setu Guru can explain the right place for a change, but saved defaults require explicit authorized approval.

## Allowed actions

- Summarize product readiness and missing fields.
- Route to product edit, Product Management, pricing calculator, or missing HSN filter.
- Suggest research prompts for HSN/HS code, destination rules, margin benchmarks, and required evidence.
- Explain whether a change belongs to product defaults, category defaults, organization defaults, or a single quote.

## Approval rules

Setu Guru must not overwrite product defaults, category defaults, or organization defaults without explicit authorized approval. Quote-specific changes should stay in the quote workspace.

## Response policy

Use live catalog search for product count, category, missing HSN, and quote-ready questions. Use live research for HSN/HS code, commodity rules, tariffs, duties, and destination compliance.
