# Runbook — Integration Replay and Governed Sync Handling

## Purpose
Handle inbound validation failures, review continuity-aware retry posture, replay failed events safely, and queue outbound syncs only when governed repo truth says the payload is safe.

## Repo source anchors
- `src/app/api/integrations/webhooks/[provider]/route.ts`
- `src/features/integrations/server/actions.ts`
- `src/features/integrations/server/governed-sync.ts`
- `src/features/integrations/server/retry.ts`
- `src/features/integrations/components/integrations-workspace.tsx`

## Inbound webhook flow
1. Provider event arrives at `/api/integrations/webhooks/[provider]`.
2. Connector registry resolves the provider.
3. The connector maps the inbound payload and validates it.
4. A continuity key is computed.
5. If Supabase persistence is enabled, the route:
   - resolves the integration by `integration_id`
   - calculates attempt count from recent matching events
   - builds inbound governance impact against contract or quote context
   - persists the event with status:
     - `failed` when provider validation fails
     - `processed` when validation passes and the impact is safe to apply
     - `needs_review` when validation passes but governed workflow truth still blocks safe application

## Replay rules
Replay is for events already stored in `integration_events`.

### Requesting a replay
Use the replay action from `/integrations` when:
- an inbound event failed validation because the payload was incomplete and the provider resent corrected data
- an event is queued / failed / needs review and the operator wants another governed processing attempt

The replay action:
- sets status back to `queued`
- preserves and increments continuity attempt count
- adds replay metadata and reason
- writes audit history

## Outbound queue rules
Only governed contract sync is supported in the current baseline.

### ERP-style governed commercial sync
Outbound sync is blocked unless:
- contract exists
- commercial lock snapshot is fully locked
- contract is signed
- contract-progression document blockers are clear

### Freight-style governed execution sync
Outbound sync is blocked unless:
- contract exists
- execution state is at least released where required
- release / dispatch / completion blockers are clear for the current posture
- required dispatch artifacts are present for the targeted payload

### Queueing an outbound sync
When safe, the queue action:
- builds a governed payload from repo truth
- preserves a continuity key and attempt count
- persists an outbound `integration_events` record in `queued` status
- writes audit history
- revalidates `/integrations`, `/orders`, and `/contracts`

## Operator checklist
### For inbound failures
1. Open `/integrations`.
2. Inspect provider, validation errors, mapped payload, and impact summary.
3. Fix the upstream payload or internal governing blocker.
4. Replay only after the root cause is resolved.

### For `needs_review`
1. Read the impact summary.
2. Open the linked contract / order / quote context.
3. Clear governed blockers first.
4. Replay only when the impact would become safe to apply.

### For outbound sync queueing
1. Open the governed outbound queue card.
2. Confirm readiness is `Ready to sync`.
3. Queue the sync.
4. Verify the new queued event appears with the correct continuity key and attempt count.

## Common failure modes
| Failure | Meaning | Required action |
| --- | --- | --- |
| Unknown connector provider | Provider route is not registered | Fix provider selection or registry |
| `integration_id is required` | Persisted webhook processing cannot resolve the integration | Include integration id in payload or header |
| Validation failed | Provider payload is malformed or incomplete | Fix the provider payload first |
| Governed sync target could not be resolved | Contract or quote continuity is missing | Restore linked context |
| First blocked reason returned from queue action | Repo truth says outbound sync is not yet safe | Clear the blocker instead of forcing the sync |

## Done criteria
An integration intervention is complete only when:
- replay or queue action is persisted
- continuity key and attempt count are preserved
- audit history reflects the operator action
- resulting event status matches governed truth rather than wishful status advancement
