# Pass 22 Lead Entry Acceleration Hotfix

## Scope

This hotfix addresses the Vercel build error and lead-entry speed improvements requested after Pass 22:

- Lead market should auto-populate from the selected country.
- Phone should auto-populate with the selected country's phone code.
- WhatsApp should default to the phone value unless entered differently.
- Supabase relation tables should receive organization-scoped rows.

## App changes

- Fixed `src/features/trade-events/server/actions.ts` build failure by replacing an undefined `organization.id` reference with `workspace.organization.id`.
- Updated the Quick Lead drawer so selecting a country pre-fills phone with the country phone code when the operator has not typed a phone yet.
- Updated phone/WhatsApp mirroring so WhatsApp follows phone until the WhatsApp field is manually edited.
- Added save-side fallback: if phone is empty, save the selected country code; if WhatsApp is empty, save the final phone value.
- Hardened direct lead relation refresh so `lead_product_interests` receives `organization_id`, matching the current schema.

## Supabase mitigation

Run:

```sql
mitigation/supabase/sql/121_pass22_lead_geo_phone_market_sync.sql
```

This migration:

- Replaces `app_refresh_lead_relations_tx` to insert `organization_id` into `lead_markets` and `lead_product_interests`.
- Replaces `sync_lead_geo_hierarchy` so country/country_id sets `market_id`, phone codes, default phone, and default WhatsApp.
- Adds an after-insert/update trigger to keep `lead_markets` synchronized from `leads.market_id`.
- Backfills existing leads with country-derived market, phone code, phone, WhatsApp, and lead-market rows where missing.
- Patches the legacy `app_upsert_lead` RPC for any remaining callers.

## Retest

1. Apply the Supabase migration.
2. Deploy the repo.
3. Go to `/leads` and open `+ Quick Lead`.
4. Select United Arab Emirates and confirm phone/WhatsApp start with the UAE phone code.
5. Type a phone number and confirm WhatsApp mirrors it.
6. Edit WhatsApp separately and confirm later phone edits do not overwrite WhatsApp.
7. Save the lead and confirm `leads.country_id`, `leads.market_id`, and `lead_markets.organization_id` are populated.
8. Test the trade-event conversion path to confirm the build error path is fixed.
