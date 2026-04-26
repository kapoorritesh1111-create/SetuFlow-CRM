# Release Proof

## Governing command

```bash
npm run release:proof
```

This is the repo-backed release-gate command for the governed baseline.

## Quote FX Lock Fix — USD Catalog to EUR Draft Quotes

- Added server-side quote FX resolution for catalog prices whose source currency differs from the quote display currency.
- USD catalog prices can now seed EUR quote lines through a weekly average USD/EUR rate from `exchange_rates` without requiring direct EUR catalog price rows.
- Draft quotes persist the locked FX context in quote workflow metadata for seven days: `source_currency`, `quote_currency`, `fx_rate`, `fx_week_start`, and `fx_valid_until`.
- Quote create, quote edit, and lead-to-quote draft seeding preserve original catalog price amount/currency while saving converted unit prices in the quote currency.
- Manual price adjustments remain supported; overridden unit prices continue to require an override reason through the governed quote validation path.
