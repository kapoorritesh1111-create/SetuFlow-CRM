# Pricing v5 — Activation-ready gate

Status: **hold for Akshay approval**.

## Built and staged

- 20 approved Stand-Up Pouch size profiles remain the only preset SUP sizes exposed to Sales.
- 44 approved standard constructions remain the only standard v5 constructions exposed to Sales.
- Owner dashboard recalculates the selected configuration automatically when size, construction, quantity, print, bottom route, or zipper changes.
- Owner dashboard can build the approved 250 / 500 / 1,000 / 2,000 / 3,000 / 5,000 / 10,000 matrix.
- Exact competitor observations are compared only when size, construction, and quantity match.
- Sales quote builder recalculates automatically and highlights better approved quantity options when unit price falls at a higher quantity.
- Sales only sees active + quoteable size and construction options returned by the published template.
- KLDs from other sizes remain hidden.
- 20 blank review KLD SVGs are staged under `public/kld/pricing-v5/sup/`.
- Review KLD samples are never written into `kld_file_id` and therefore cannot masquerade as production-approved files.
- Production KLD coverage is shown separately from review-sample coverage.
- v4 fallback remains unchanged.

## Stark KLD reference used

The supplied Stark reference for W170 × H260 establishes the visual convention used by the blank review samples: front / bottom-gusset / back layout, 7.5 mm side trim, 15 mm zipper zone, 4 mm trimming bridges, blank artwork area, and gusset fold curves.

The generated SVGs are **review/engineering placeholders, not production dielines**. Stark can replace/link the approved production file for each size later.

## Activation blockers / approval decisions

1. Akshay approves the Pricing v5 business rules and Sales UX.
2. Akshay confirms whether missing production KLDs are a hard blocker or whether quoting may proceed while a review sample exists.
3. Akshay confirms 160 × 240 as the v5 size rather than the v4 160 × 230 baseline.
4. Akshay approves the 110 × 170 conditional bottom route.
5. Akshay approves the automatic split-gusset route for 260 × 340 and 280 × 360.
6. Akshay approves all 44 standard constructions and the five commercial bucket schedules.
7. Exact competitor evidence remains optional for pricing activation, but market-position claims must not be made without exact comparable observations.

## Other packaging families

Flat Bottom, Center Seal Roll, Center Seal Pouch, 3 Side Seal Roll, and 3 Side Seal Pouch must use the same detailed RMC/process-costing philosophy, but they must not reuse SUP size presets, SUP pricing buckets, or SUP geometry unless their own approved template explicitly defines them.

Until family-specific templates are approved, no SUP size/bucket dropdown should be shown for those families.

## Merge / activation sequence

1. Merge this branch only after the Pricing v5 verification workflow is green and Akshay has approved the remaining business decisions.
2. Keep the existing v5 feature-flag / published-template gates in place.
3. Do not convert review KLD samples into production KLD rows automatically.
4. After merge, verify Stark Admin price dashboard, Sales quote builder, exact-size KLD filtering, 110 × 170 route, split-gusset sizes, and v4 fallback.
