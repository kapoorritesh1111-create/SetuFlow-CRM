You are continuing from the latest Setu Flow CRM repo update.

Use the current repo as the source of truth.

## Immediate objective
Execute PR-31.

## Mandatory first step
Update `public/internal-dcc/index.html` FIRST.

## PR-31 scope
1. Reconcile accepted quote truth across:
   - quotes
   - quote_versions
   - quote_negotiation_events
   - contracts
2. Surface one approval-governed golden quote path.
3. Make the buyer demo path crystal clear:
   - lead
   - product/category interest
   - quote
   - override + reason + approval
   - contract continuity
   - execution readiness
4. Keep the pricing rule intact:
   - base catalog price is default
   - override requires reason
   - approval remains enforced
5. Update all docs and truth surfaces accordingly.

## Return
1. Updated full repo
2. Updated DCC
3. Updated readiness summary
4. Exact PR-31 completion delta
5. Remaining PR stack
6. Next prompt for PR-32
