# S24-SPEN Packaging Vertical — Changed Files Manifest

## New files
- src/lib/verticals/capability.ts
- src/lib/packaging/types.ts
- src/lib/packaging/pricing-engine.ts
- src/lib/packaging/seed-data.ts
- src/lib/packaging/seed.ts
- src/lib/packaging/queries.ts
- src/lib/setu-guru/packaging-guidance.ts
- src/features/packaging/server/actions.ts
- src/features/packaging/components/packaging-catalog.tsx
- src/features/packaging/components/packaging-line-configurator.tsx
- src/features/packaging/components/packaging-quote-section.tsx
- src/features/packaging/components/pricing-template-builder.tsx
- src/app/(app)/admin/packaging-templates/page.tsx
- tests/packaging/pricing-engine.test.ts

## Edited files
- src/features/quotes/canonical/CanonicalQuoteBuilder.tsx        (packaging prop, packaging-aware line helpers, ProductStep section, Review preview)
- src/features/quotes/canonical/CanonicalQuoteBuilderApprovalQueueV2.tsx  (packaging prop pass-through)
- src/features/quotes/canonical/actions-stabilized.ts            (product replace preserves line_type='packaging'; total_line_count recount)
- src/app/(app)/leads/[leadId]/quote/page.tsx                    (packaging capability + data fetch)
- src/app/(app)/products/page.tsx                                (packaging catalog default; classic at ?mode=products)
- src/lib/queries/query-core.ts                                  (line-item select + typed packaging fields)
- src/lib/queries/data.ts                                        (line-item select + typed packaging fields)
- src/features/client-onboarding/server/provisioning.ts          (packaging_converter → vertical_key + seeds + audit log)
- src/lib/setu-guru/page-context.ts                              (packaging-templates route context)
- tests/design-tokens.test.mjs                                   (ratchet re-baselined for pre-existing marketing files)
- package.json                                                   (test:packaging script)

## Scroll bugfixes (added after QA feedback — S24-SPEN-212 / -213)
- src/app/smc/qa/run/[suiteKey]/run-board.tsx   (wrap cases in .smc-cs scroll region)
- src/app/smc/qa/qa-workspace.tsx               (wrap tab body in .smc-cs)
- src/app/globals.css                           (only-child override so headerless drawers — Setu Guru — keep flex height and scroll)

## Supabase (already applied to production project sjzfzloggabsmcuxktnl)
- Migration s24_spen_packaging_vertical_foundation (tables, columns, RLS, backfill)
- Seeds: 9 packaging_service_families + 5 packaging_pricing_templates (org 3f8ef935…, idempotent)
- Rate tuning update on 3 dimensional templates (matches seed-data.ts)
- QA suite: qa_test_suites/qa_test_cases suite_key 's24-spen-packaging' (20 cases, 9 critical) → /smc/qa/run/s24-spen-packaging
- sprint_issues S24-SPEN-201..211 → In Review with fix_applied/files_changed/qa_notes

## Verification run in sandbox
- npx tsc --noEmit → 0 errors
- npm run test:packaging → 12/12 pass
- node --test tests/design-tokens.test.mjs → 5/5 pass
