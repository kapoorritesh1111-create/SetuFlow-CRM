# C4 Security Batch 9

Date: 2026-09-19

Removed anonymous execution from:
- seed_trade_show_trial_preview_data
- sync_trade_show_trial_onboarding_request

Authenticated and service_role EXECUTE remain enabled.

These functions mutate internal trial preview/onboarding data and are not public signup entrypoints.

Anonymous SECURITY DEFINER count:
- Before C4: 36
- After Batch 8: 16
- After Batch 9: 14

Post-change runtime errors: 0.

The remaining anonymous SECURITY DEFINER functions require usage-specific tracing because they include public invitation/trial/token flows, RLS membership/admin helpers, and intentionally public counters.
