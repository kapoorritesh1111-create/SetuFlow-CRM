# E2E 8.2A PR 13 - Lead coverage and quote seed regression

This regression records the acceptance path that failed in E2E 8.2A.

## Required covered path

1. Create Quick Lead as a buyer.
2. Open the lead.
3. Map at least one product and one market in Coverage.
4. Create Quote.
5. Verify the quote has at least one `quote_version_line_items` row.
6. Verify Product step is incomplete when no products exist.
7. Verify Product step becomes complete after coverage mapping.

## Current implementation note

The production safeguard is split across:

- `LeadCoverageRecoveryBoundary`, which prevents the create-quote dead end from becoming silent and routes operators to Coverage.
- Supabase migration `e2e_8_2a_lead_coverage_quote_seed`, which auto-links obvious buyer lead product text and seeds empty quote versions from `lead_product_interests` using `product_pricing_rules`.

The UI test should assert visible recovery copy: `Coverage required` and `Open coverage manager` whenever Create Quote is attempted without mapped products.
