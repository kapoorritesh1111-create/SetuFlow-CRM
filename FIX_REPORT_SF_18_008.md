# SF-18-008 / 008A / 008B / 008C Combined Fix Report

## Scope
This repo patch treats the dependent `as any` cleanup issues as one bundled fix across the uploaded deployed repository.

## Completed
- Removed all exact `as any` casts from:
  - `src/features/orders/`
  - `src/features/leads/`
  - `src/features/quotes/`
- Removed Supabase client `as any` casts in the targeted feature paths where the typed Supabase client can be used directly.
- Replaced lead command-center field casts with typed field access (`jobTitle`, `whatsappNumber`, stage metadata fields).
- Reworked quote normalization to accept `unknown[]` and normalize through explicit record guards instead of `any[]`.
- Replaced quote/lead integration casts with `unknown`/typed fallback casts where the existing component contract needs follow-up type tightening.

## Validation performed
- Static grep validation:
  - `grep -R " as any" -n src/features/orders src/features/leads src/features/quotes` returns 0 matches.
- `npx tsc --noEmit --skipLibCheck` could not run meaningfully because the uploaded zip does not include `node_modules`, so Next/React/Node/Supabase type packages are unavailable in the sandbox. No `npm ci` was run.

## Notes
- This patch intentionally focuses on the dependent `as any` cleanup bundle for SF-18-008/008A/008B/008C.
- Some broader `any` type annotations still exist in older server helper signatures, but the exact forbidden `as any` casts have been removed from the targeted Orders/Leads/Quotes feature paths.

## Build Error Follow-up Patch

Patched the Vercel build error reported on `src/features/leads/command-center/adapters.ts` where `data.lead?.whatsapp_number` was read but the `LeadProfileData['lead']` Pick type did not include `whatsapp_number`.

Files updated:
- `src/lib/queries/query-core.ts`
- `src/lib/queries/data.ts`

Change:
- Added `'whatsapp_number'` to the `LeadProfileData.lead` Pick type so it matches the existing Supabase select and adapter usage.

Validation:
- Confirmed the select already includes `whatsapp_number`.
- Could not run `npm run build` locally because this uploaded zip does not include `node_modules` and `npm ci` was not run.
