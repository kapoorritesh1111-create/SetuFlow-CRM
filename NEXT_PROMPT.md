You are continuing the Setu Flow CRM workflow reset from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, release recommendation, workflow direction, module percentages, and remaining PR roadmap.

Immediate objective:
Execute PR-RESET-02: compact action-first workflow structure across operator-heavy lanes.

Goal:
Take the reset beyond Quote so Follow-up, Pipeline, Orders / Execution, and Contracts all reduce scrolling, reduce reading, and make the next action obvious above the fold.

Focus:
Do not add decorative UI. Compress workflow interaction cost.

Scope:
1. Apply the compact action-first pattern to operator-heavy lanes:
   - Follow-up
   - Pipeline
   - Orders / Execution
   - Contracts
2. Every workflow should answer above the fold:
   - where am I
   - what is blocking me
   - what do I do next
3. Collapse secondary explanation and audit-heavy detail by default
4. Keep proof, but do not force operators to read proof before acting
5. Preserve workflow diagram in DCC unless product truth changes
6. Keep explicit module percentages and remaining PR roadmap in DCC

Return:
1. Updated repo zip
2. Updated DCC
3. PR-RESET-02 summary
4. Updated readiness by module
5. Remaining blockers
6. Next PR step
