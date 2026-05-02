# Pass 22.2 Country UUID Hotfix

## Issue

Quick Lead reached the final save step but failed with:

```text
invalid input syntax for type uuid: "United States"
```

The country text label was being submitted into the `country_id` path instead of the selected country UUID.

## Fix

- The client submit handler now explicitly sets:
  - `country_id` = selected country UUID
  - `country` = selected country name
  - `phone_country_code` = selected country phone code
- The visible country select no longer has the same `name="country_id"` as the canonical hidden submit field, avoiding duplicate FormData ambiguity.
- The server action now defensively resolves a text country value back to the matching `countries.id` before validating or writing UUID columns.

## Supabase check

Live Supabase already has the needed columns and constraints for this behavior:

- `countries.id`
- `countries.name`
- `countries.market_id`
- `countries.phone_code`
- `leads.country_id`
- `leads.market_id`
- `leads.phone_country_code`
- `leads.whatsapp_number`
- `lead_markets.organization_id`
- `lead_markets` unique constraint on `(lead_id, market_id)`

No additional SQL mitigation is required for this specific UUID/text submission bug.

## Retest

1. Deploy this repo.
2. Open `/leads`.
3. Click `+ Quick Lead`.
4. Select `United States`.
5. Confirm phone code pre-fills.
6. Continue to final step until button says `Save lead`.
7. Save.
8. Confirm no `invalid input syntax for type uuid: "United States"` error.
9. Confirm saved lead has a UUID in `country_id` and text in `country`.
