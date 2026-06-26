# S37 Canonical Quote Builder Hotfix

## User-reported production issues

The 2026-06-25 recording showed the canonical quote route opening, but the working flow still had practical blockers:

- New quote product rows reached Step 1, but pricing was not carried forward into Step 2.
- Save/continue buttons could fall into the generic Next.js error screen instead of keeping the user in the builder with a visible error.
- Submit for Approval could be clicked repeatedly without clear success or failure feedback.
- The quote page consumed too much vertical space on a laptop screen, forcing unnecessary scrolling for simple tasks.

## Fixes applied

### Pricing carry-forward

- Step 1 now preserves existing unit price, basis, price source, and freight as hidden form values when saving products.
- Quote save actions now enrich saved lines from `product_pricing_rules` and product metadata when unit price is missing.
- `quote_line_items` and `quote_version_line_items` are both written with a usable fallback price where catalog pricing is available.

### Action failure handling

- Product, pricing, terms, approval, and send actions now redirect back to the canonical quote route with `quoteActionError` instead of throwing to the generic error page.
- Successful saves redirect with `saved=products|pricing|terms|approval|sent` so the UI can show a confirmation banner.
- The action layer still rethrows framework redirects and does not swallow successful navigation.

### Approval flow

- Submit for Approval still uses `public.app_submit_quote_approval_tx`.
- The action now validates current quote version fallback from `quote_versions` if the parent quote pointer is missing.
- Approval errors are surfaced inline on Step 5.

### Laptop density

- Removed the duplicate internal Quote header because the app shell already shows the page context.
- Reduced hero, stepper, card, table, and button padding.
- Reduced quote builder side-panel widths and table minimum widths.
- The main Step 1 and Step 2 actions should now require less vertical scrolling.

## Preserved rules

The hotfix does not write parent quote status/pointer columns:

- `quotes.status`
- `quotes.current_version_id`
- `quotes.sent_version_id`
- `quotes.accepted_version_id`

Commercial truth remains in quote versions and version line items.
