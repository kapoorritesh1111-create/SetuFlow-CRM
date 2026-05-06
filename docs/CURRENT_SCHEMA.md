# Current Supabase Schema Summary

_Last reviewed: 2026-05-05_

This document reflects the live Supabase project reviewed during the cleanup pass.

## Project reviewed

| Item | Value |
| --- | --- |
| Project | `SETU Flow CRM` |
| Project ref | `sjzfzloggabsmcuxktnl` |
| Status | `ACTIVE_HEALTHY` |
| Region | `us-west-2` |
| Postgres | `17.6.1.063` |
| Applied migration reported by Supabase | `20260504022303_fix_client_onboarding_notification_columns` |

The checked-in repo still contains source-controlled migration history under `supabase/migrations/`. Supabase currently reports one applied migration through the management API, so treat live schema inspection as the operational truth and local SQL files as source-controlled history that needs reconciliation before migration work.

## Major table groups

| Group | Representative tables |
| --- | --- |
| Identity/org | `profiles`, `organizations`, `organization_members`, `roles`, `user_roles`, `role_permissions`, `organization_invitations` |
| Leads/pipeline | `leads`, `lead_activities`, `lead_follow_ups`, `lead_markets`, `lead_product_interests`, `lead_stage_history`, `pipelines`, `pipeline_stages`, `next_steps` |
| Quotes/RFQs/orders | `rfqs`, `rfq_line_items`, `quotes`, `quote_versions`, `quote_version_line_items`, `quote_negotiation_events`, `contracts`, `contract_line_items` |
| Products/pricing | `products`, `product_variants`, `product_categories`, `pricing_rule_sets`, `product_pricing_rules`, `pricing_engine_settings`, `pricing_calculator_default_rules`, `freight_profiles` |
| Documents/compliance | `documents`, `document_versions`, `document_requirement_rules`, `compliance_checklist_items`, `lead_compliance_items` |
| Trade events/mobile intake | `trade_events`, `trade_event_entries`, `my_card_settings` |
| AI/communications | `communications`, `ai_suggestions` |
| Imports/staging | `import_runs`, `import_issues`, `import_normalization_rules`, `stg_product_*`, `stg_pricing_*`, `stg_lead_*`, `stg_quote_*` |
| Reference data | `markets`, `countries`, `hs_codes`, `hs_duties`, `exchange_rates` |

## Current source-of-truth rules

| Workflow | Primary tables |
| --- | --- |
| Catalog pricing | `pricing_rule_sets`, `product_pricing_rules` |
| Runtime quote versions | `quote_versions`, `quote_version_line_items`, `quote_pricing_snapshots` |
| Quote negotiation | `quote_negotiation_events` |
| Accepted quote to execution | `contracts`, `contract_line_items` plus accepted quote/version references |
| Communications | `communications` |
| AI-assisted drafts | `ai_suggestions` |
| Trade-show raw intake | `trade_event_entries` |
| Client onboarding | `client_onboarding_requests` |

## Compatibility tables

The live schema marks these as compatibility-only or legacy-support surfaces:

- `product_prices`
- `quote_line_items`
- `rfq_line_items`
- `contract_line_items` for legacy price continuity while versioned quote line truth matures
- selected legacy fields on `products` and `leads`

New runtime pricing and commercial logic should avoid making these compatibility surfaces the primary truth unless the code path explicitly documents fallback behavior.

## Advisor findings to harden later

No database changes were applied in the cleanup pass. The live advisor review produced these release-hardening categories:

1. RLS-enabled tables without policies.
2. Security-definer view exposure on `active_product_pricing_rules_v`.
3. Functions with mutable search paths.
4. `SECURITY DEFINER` RPCs executable by `anon` and/or `authenticated` roles.
5. Leaked password protection disabled in Auth.

A future database-hardening pass should convert these findings into scoped migrations and regression checks.
