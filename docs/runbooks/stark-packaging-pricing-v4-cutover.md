# Stark Packmate Packaging Pricing v4 — Cutover and Rollback Runbook

Issue: `S51-PKG-051`  
Organization: Stark Packmate (`b97913cb-3b95-4247-8ced-ffdc0d392d2a`)  
Feature flag: `packaging_pricing_v4`

## Safety contract

Pricing v4 is additive. The existing v3 pricing family/template and quote route remain intact during migration, validation, dual-run and UAT. Do not archive, delete or mutate v3 as part of the v4 cutover. The first rollback action is always to disable the v4 feature flag.

Do not enable the feature flag until every gate below is green and the user explicitly approves production cutover.

## Migration order

Apply the reviewed migrations in repository order:

1. `20260817093000_s51_pkg_043_packaging_pricing_v4_foundation.sql`
2. `20260817100000_s51_pkg_043_live_schema_reconcile.sql`
3. `20260817103000_s51_pkg_044_stark_v4_seed.sql`
4. `20260817110000_s51_pkg_050_pricing_snapshot_cogs_rls.sql`
5. `20260817113000_s51_pkg_050_packaging_v4_atomic_quote_persistence.sql`
6. `20260817120000_s51_pkg_047_stark_full_matrix_seed.sql`

Use the managed Supabase migration mechanism so production migration history is recorded. Never paste these DDL changes through an ad-hoc application query.

## Gate A — pre-application proof

Before applying production migrations:

- Confirm GitHub `main` still matches the approved merge target and PR #79 is the reviewed source.
- Confirm PR/Vercel checks are green.
- Record current Stark v3 family/template IDs, row counts and serialized pricing fields so rollback can prove v3 was unchanged.
- Record the current `packaging_pricing_v4` feature flag state. It must be absent or disabled with `rollout_percentage = 0`.
- Confirm workbook source SHA-256 for the matrix seed is `7851bf306b8747780a0865b39deb706985cede087a55b41615952be5da8f2899`.
- Confirm no production migration in the list above has already been partially applied outside migration history.

## Gate B — schema, tenant and source integrity

Immediately after applying migrations, while the v4 feature flag is still OFF:

- Confirm all normalized v4 tables and expected columns exist.
- Confirm every public v4 table has RLS enabled and organization-aware policies.
- Confirm `anon` cannot read v4 pricing internals.
- Confirm normal Sales/member access cannot directly read Cost Master, Charge Master, recipes, commercial bands, matrix rates or full `quote_pricing_snapshots` COGS payloads.
- Confirm owner/admin can manage the intended Admin records.
- Confirm the service-role-only quote persistence RPC is not executable by `public`, `anon` or `authenticated`.
- Run Supabase security/performance advisers and investigate any new issue caused by the migrations.
- Compare the recorded v3 family/template values with post-migration values; they must be unchanged.

Expected Stark matrix source counts:

| Data sheet | Expected rows |
|---|---:|
| CS DATA | 96 |
| 3SS ROLL FORM DATA | 48 |
| 3SS POUCH FORM DATA | 48 |
| **Total** | **192** |

Verify all rows retain `source_worksheet`, `source_row_number`, `source_reference`, workbook hash and editable/calculated field metadata.

## Gate C — calculation acceptance

### SUP mandatory calibration

Run the v4 Test Quote with:

- Family: Stand Up Pouches
- Size: 250gm, 160 × 230, BG 50+50
- Construction: Matte + Foil
- PE: PE75 selected through the recipe mapping
- Print: CMYKW
- Zipper: ON
- Quantity: 5,000

Expected acceptance values:

- 7 pouches/frame
- Material RMC + production-stage zipper per frame ≈ ₹15.24761182
- Process cost/frame = ₹62.80
- Unit price ≈ ₹15.83605329
- Product total ≈ ₹79,180.27
- GST 18% ≈ ₹14,252.45
- Grand total before freight ≈ ₹93,432.71

A material/calculation difference blocks release.

### Matrix acceptance

Verify at minimum:

- Center Seal `SPPL78`: Q1–Q5 = 110, 105, 85, 79.5, 74.5; 100 × 140 resolves to 56 pouches/frame.
- 3SS Roll `SPPL174`: Q1–Q5 = 110, 105, 85, 79.5, 74.5.
- 3SS Pouch `SPPL222`: Q1–Q5 = 120, 115, 99.8, 92.27, 86.225.
- Editing a yellow hardcoded source cell recalculates dependent gray formula cells, including cross-sheet 3SS Pouch references.
- Formula cells cannot be overwritten directly.

## Gate D — Admin and Sales security flow

While the v4 feature flag is still OFF for Sales routing, validate Admin/Test Quote behavior:

- Create/edit a Service Family.
- Create/edit a Product Size; physical fields are editable while calculated display labels remain read-only.
- Create/edit Material/Process Cost Master and family availability.
- Create/edit Extra/Pre/Post Charge Master and family availability.
- Create a Pricing Template from blank and by copying another template.
- Add/edit/remove recipe items through typed controls; no raw JSON editor is used.
- Add/edit/remove SUP commercial bands.
- Verify all editable pricing/setup fields are yellow and calculated/immutable fields are gray.
- Verify publish validation blocks incomplete sources/rates and incorrect matrix row counts.

Then enable v4 only in a controlled Stark preview/UAT context and validate the Sales flow:

- Sales sees published/quoteable options only.
- Sales never receives raw Cost Master or Charge Master rates, COGS, wastage, margins or internal snapshot payloads.
- Server preview and saved quote use the same authoritative engine output.
- Browser-submitted unit price is never trusted.
- KLD selection is validated against organization/family/variation before save.

## Gate E — immutable quote proof

Create a controlled quote/version using v4, then:

1. Record its unit price, totals, selected variation, KLD metadata and source hash.
2. Change a Master rate in Admin.
3. Confirm a new preview/new quote uses the new rate.
4. Confirm the old quote version and its admin-only pricing snapshot still reproduce the original Master IDs/rates/UOMs, geometry, band, charges, totals, KLD metadata and source hash.
5. Replace/upload a newer KLD and confirm the old quote keeps the prior KLD metadata frozen in its snapshot.

Failure of immutability blocks cutover.

## Gate F — dual-run and user UAT

With v3 still available, run representative Stark quotes through both paths. Record differences and resolve any unexplained variance. Include:

- all six SUP commercial bands
- CMYK and CMYKW
- zipper on/off
- every publishable SUP construction
- matrix Q1–Q5 tiers
- Center Seal, 3SS Roll and 3SS Pouch
- configured Extra/Pre/Post charges
- GST and freight handling
- quote save/version/approval/PDF flow

Do not mark S51-PKG-051 resolved until the user has reviewed and approved the final production behavior.

## Production cutover

After explicit approval only:

1. Confirm a fresh green production deployment from the approved merge.
2. Confirm Gates A–F are recorded in SMC.
3. Enable `packaging_pricing_v4` only for Stark Packmate using the existing allowlist and controlled rollout.
4. Keep v3 records intact.
5. Execute a final Stark Sales smoke quote and Admin Test Quote.
6. Re-run direct COGS/snapshot access checks with a Sales/member user.
7. Record deployment, feature-flag state and smoke-test evidence in SMC.

## Rollback

If any post-cutover issue appears:

1. Disable `packaging_pricing_v4` immediately (`enabled = false`, `rollout_percentage = 0`).
2. Verify Stark Sales returns to the existing v3 path.
3. Do **not** delete v4 tables/data or rewrite historical quote snapshots as the first response.
4. Confirm quotes created before the issue remain readable/versioned.
5. Record the failure and rollback proof in SMC.
6. Fix forward in a reviewed change, rerun Gates A–F, then request approval before another cutover.

Schema rollback is a last resort and must be handled as a separately reviewed migration because immutable quote versions/snapshots may already reference v4 records.
