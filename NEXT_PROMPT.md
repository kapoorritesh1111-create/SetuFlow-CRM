You are continuing the Setu Flow CRM brutal UX review from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, PR-UX status, and workflow direction.

Immediate objective:
Execute PR-UX-01: Navigation reset + information architecture cleanup.

Mandatory first step:
Update public/internal-dcc/index.html FIRST.

PR-UX-01 scope:
1. Redesign the primary app shell/navigation so a trade operator can instantly understand where to go for:
   - Capture
   - Follow-up
   - Quote
   - Approval / Send
   - Orders / Execution
   - Exceptions / Risks
   - Catalog / Admin / Settings
2. Reduce the feeling that critical modules are hidden or scattered.
3. Propose and implement a clearer top-level operating structure in the repo.
4. Keep the governed commercial contract intact:
   - catalog/base pricing stays default
   - override requires reason
   - approval remains required when threshold is met
5. Keep the DCC updated with:
   - new readiness scores
   - PR-UX-01 status
   - module deltas
   - remaining PR count to reach 96%+ per module
6. Be brutal: remove or demote anything in navigation that weakens the mental model.

Files to inspect and update:
- public/internal-dcc/index.html
- src/lib/routes/manifest.json
- src/lib/product-contract.ts
- src/components/layout/app-shell.tsx
- src/components/layout/shell/*
- any route-level labels or shell descriptors affected by the nav reset
- NEXT_PROMPT.md

Return:
1. Updated full repo zip
2. Updated DCC
3. PR-UX-01 summary
4. Updated readiness by module
5. Remaining PR-UX stack
6. Brutal notes on what is still broken
7. Next prompt for PR-UX-02
