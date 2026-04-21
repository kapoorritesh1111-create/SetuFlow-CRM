# Demo Data Audit

This document summarizes what the uploaded Supabase export currently proves.

## Confirmed counts

The current export shows:

- 35 buyers
- 10 suppliers
- 21 products
- 31 variants
- 8 quotes
- 3 contracts
- 7 documents
- 0 integrations configured fileciteturn3file0

## Commercial strengths

### Market and lead coverage
The dataset includes buyer and supplier leads across North America, Europe, the Middle East, Asia, Oceania, and Africa. The lead pool is large enough for a serious demo. fileciteturn3file0

### Product coverage
The dataset includes chips, powders, jaggery-related items, and multiple variant/pack forms. This is enough to support category and product-specific storytelling. fileciteturn3file0

### Pricing policy exists
The pricing engine settings show:

- `require_approval_for_override = true`
- `approval_threshold_percent = 5` fileciteturn3file11

### Continuity exists in part of the downstream chain
Some contract line items already preserve:

- source quote line item id
- catalog price amount
- final unit price
- product variant id
- continuity snapshot details fileciteturn3file6turn3file15

## Data gaps that matter

### Accepted-state mismatch
The summary reports:

- `accepted_quotes = 0`
- `quotes_requiring_approval = 0` fileciteturn3file0

But quote negotiation events include accepted events for multiple quote ids. fileciteturn3file0turn3file1

That means the current dataset weakens trust unless these states are reconciled.

### Execution is structurally present, not yet operationally convincing
Contracts exist, but visible examples still show:

- `status = draft`
- `execution_state = draft`
- `approval_state = not_required` fileciteturn3file3turn3file12

### Contract continuity is inconsistent
Some contract lines are rich and continuity-aware. Others still have:

- null `product_variant_id`
- null `catalog_price_amount`
- empty `continuity_snapshot`
- null `source_quote_line_item_id` fileciteturn3file4turn3file7turn3file14

### Integrations are absent in current live configuration
The export shows `integrations = 0`. fileciteturn3file0

## Current conclusion

The demo data is good enough to support a real product demo.

It is **not yet clean enough** to justify strong claims such as:

- full investor readiness
- fully proven acceptance-to-execution continuity
- production-grade integration maturity
- fully surfaced override approval proof
