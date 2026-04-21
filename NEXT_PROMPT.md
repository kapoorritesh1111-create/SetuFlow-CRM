You are continuing the Setu Flow CRM brutal UX review from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, PR-UX status, and workflow direction.

Immediate objective:
Execute PR-UX-02: Follow-up + quote command-center compression.

Mandatory first step:
Update public/internal-dcc/index.html FIRST.

PR-UX-02 scope:
1. Compress the Follow-up and Quote working set so operators can move from qualification to governed quoting with less route-switching and less interpretation.
2. Make the “what do I do next?” path explicit for every major lead/quote state.
3. Reduce duplicated summary chrome and promote one stronger command-center pattern.
4. Keep the governed commercial contract intact:
   - catalog/base pricing stays default
   - override requires reason
   - approval remains required when threshold is met
5. Keep the DCC updated with:
   - new readiness scores
   - PR-UX-02 status
   - module deltas
   - remaining PR count to reach 96%+ per module
6. Be brutal: delete, merge, or demote any UI that makes Follow-up and Quote feel like separate products.

Files to inspect and update:
- public/internal-dcc/index.html
- src/app/(app)/leads/*
- src/app/(app)/quotes/*
- src/features/leads/*
- src/features/quotes/*
- any shared state, shell labels, or route descriptors affected by the compression
- NEXT_PROMPT.md

Return:
1. Updated full repo zip
2. Updated DCC
3. PR-UX-02 summary
4. Updated readiness by module
5. Remaining PR-UX stack
6. Brutal notes on what is still broken
7. Next prompt for PR-UX-03
