# Setu Guru HS / HSN / Commodity Code Enrichment Workflow

_Last updated: 2026-05-06_

## Goal

Help users find missing HS / HSN / HTS / commodity codes for products in Setu Flow CRM while keeping classification decisions reviewable and auditable.

## Important distinction

- **HS code**: internationally harmonized first 6 digits.
- **HSN code**: India term often used for GST/export classification, based on HS.
- **Commodity code**: country/region-specific extension, often 8-10 digits or more.
- **HTS code**: US-specific tariff classification.

Setu Guru should not treat one country’s full code as automatically valid in another country. Only the first 6 HS digits are broadly harmonized; local extensions can differ.

## Required product context before searching

For each product, gather as much as possible:

- Product name
- SKU / variant
- Category
- Ingredients or material composition
- Processing method: dried, freeze-dried, fried, vacuum-cooked, powder, raw, roasted, sweetened, salted, etc.
- Packaging form: bulk, retail pack, sachet, jar, case, bag
- Intended use: food ingredient, snack, supplement, industrial input, retail consumer product
- Origin country
- Destination/import country

## Single product workflow

1. User asks: “What is the HSN code for mango powder?”
2. Setu Guru asks for missing classification-critical details only if required.
3. Run live search against official tariff/classification sources.
4. Return candidates with descriptions and confidence.
5. Explain why the candidate matched.
6. Suggest saving as a draft candidate or asking admin to confirm.

## Batch workflow: “Find and fill missing HSN codes”

Setu Guru should follow this safe sequence:

1. Query CRM for products where HS/HSN/commodity code is empty.
2. Group similar products by category and processing method.
3. For each group, run live research using official tariff sources.
4. Produce a review table:
   - Product
   - Variant/SKU
   - Current code
   - Candidate HS/HSN/commodity code
   - Candidate description
   - Destination/country basis
   - Confidence
   - Sources
   - Notes / missing details
5. Ask an admin/manager to approve rows.
6. Only update approved rows.
7. Store research notes and source links in the product audit trail.

## Confidence scoring

| Confidence | Use when |
| --- | --- |
| High | Product description, composition, processing, and tariff language clearly match; official source confirms. |
| Medium | Likely match but one or more details are missing, such as sugar content, processing method, or retail/bulk pack. |
| Low | Product is ambiguous, mixed/composite, regulated, supplement-like, medicinal, or official rulings conflict. |

## CRM write-back rules

Allowed:

- Save candidate classification to a draft field.
- Export candidate CSV.
- Create admin review task.
- Update approved product rows.

Not allowed without explicit approval:

- Directly overwrite existing codes.
- Mark classification as legally final.
- Use India HSN as UK/EU/US full commodity code without destination validation.
- Classify complex food/supplement/medicinal products without warning.

## Recommended CRM fields for future database support

If adding schema later, consider:

- `products.hs_code_candidate`
- `products.hs_code_candidate_country`
- `products.hs_code_confidence`
- `products.hs_code_sources_json`
- `products.hs_code_review_status`
- `products.hs_code_reviewed_by`
- `products.hs_code_reviewed_at`
- `products.hs_code_notes`

## Example user answer

```text
Likely code candidate: 0712.90 for dried vegetables, but I need to confirm the exact product form and destination code extension.

For UK/EU import, the first six HS digits may be harmonized, but the final commodity code digits and controls must be checked in the destination tariff portal.

I can prepare a review table for all products missing codes. I will not overwrite product master data until an admin approves the suggested rows.
```
