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


## C4 Batch 10
Anonymous execution removed from:
- get_trial_capability
- is_trial_org
- is_platform_support_user

Authenticated and service_role EXECUTE remain enabled.

Anonymous SECURITY DEFINER count:
- After Batch 9: 14
- After Batch 10: 11

Post-change runtime errors: 0.

Remaining anonymous SECURITY DEFINER functions are now held for preserve/redesign classification rather than further blanket revocation.
