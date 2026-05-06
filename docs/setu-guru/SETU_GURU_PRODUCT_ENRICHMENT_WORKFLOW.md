# Setu Guru Product Enrichment Workflow

_Last updated: 2026-05-06_

## Purpose

Define how Setu Guru should handle product data improvement requests, including missing HS/HSN codes, missing product attributes, missing pricing assumptions, and missing compliance tags.

## Supported requests

- “Find all products missing HSN codes.”
- “Fill missing HSN codes for listed products.”
- “Which products are missing HS code, origin country, or MOQ?”
- “Suggest compliance document requirements for these products going to the UK.”
- “Give me margin assumptions for all snack products.”

## Safe workflow

1. Read product records the user has access to.
2. Identify missing or low-quality fields.
3. Research candidates with live search when external facts are involved.
4. Produce a review table.
5. Ask for row-level or batch approval from an authorized user.
6. Write only approved values.
7. Store source and confidence notes.

## Review table columns

| Column | Meaning |
| --- | --- |
| Product | Product name from CRM |
| Variant/SKU | Variant or SKU if available |
| Missing field | HS code, HSN, commodity code, margin, compliance document, etc. |
| Candidate value | Suggested value |
| Basis | Why this suggestion applies |
| Source | Official or reputable source used |
| Confidence | High / Medium / Low |
| Action | Approve, edit, reject, needs broker review |

## Write-back rules

Setu Guru can write product fields only when:

- User explicitly asks to apply approved rows.
- User has the correct CRM permission.
- The row has a candidate value, source, and confidence.
- Existing non-empty values are not overwritten unless user explicitly confirms.

## Recommended product-enrichment API flow

Frontend:

1. User opens Products or Catalog Command Center.
2. User asks Setu Guru: “Find missing HSN codes.”
3. Setu Guru calls a secure API route to fetch products missing HS/HSN fields.
4. Setu Guru runs live research per product group.
5. UI shows review table.
6. User approves rows.
7. API writes approved values and audit notes.

Backend endpoints recommended:

- `GET /api/setu-guru/products/missing-classification`
- `POST /api/setu-guru/research`
- `POST /api/setu-guru/products/classification-preview`
- `POST /api/setu-guru/products/apply-approved-classification`

## Audit log fields

- `organization_id`
- `user_id`
- `entity_type`
- `entity_id`
- `requested_action`
- `before_value`
- `after_value`
- `source_urls`
- `confidence`
- `approved_by`
- `approved_at`

## User-facing message when applying changes

```text
I found candidate HS/HSN codes for the selected products. I have not changed product master data yet. Review the confidence and sources, then approve the rows you want me to update.
```
