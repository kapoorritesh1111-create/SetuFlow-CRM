You are continuing the Setu Flow CRM final production readiness pass from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, release recommendation, and workflow direction.

Immediate objective:
Execute PR-FINISH-05: Version-bound contract snapshot + execution immutability hardening.

Goal:
Eliminate the last remaining gap between “clear execution” and “provable execution” by making contract handoff and execution fully version-bound and immutable.

Focus:
This is the most important backend-proof pass remaining.
Do not focus on UI polish.

Scope:
1. Create version-bound contract snapshot (CRITICAL)
   - introduce a dedicated accepted quote snapshot structure if repo allows:
     - version_id
     - locked commercial lines
     - pricing basis
     - approval status
     - override state
     - timestamp
   - stop reconstructing contract state from quote-level tables

2. Bind Orders / Execution strictly to snapshot
   - execution must read ONLY from:
     - accepted snapshot
     - not current quote draft
   - remove any fallback to quote-level derivation

3. Make immutability provable
   - once accepted:
     - commercial lines cannot mutate
   - UI must reflect:
     - “locked from version X”
   - backend must enforce:
     - no mutation path

4. Backfill strategy (honest handling)
   - do NOT fake legacy proof
   - clearly label:
     - “legacy record (no snapshot)”
   - ensure new records are fully provable

5. Strengthen traceability
   - every execution line should map to:
     - snapshot line id (if repo supports)
   - surface gaps explicitly

6. DCC integrity update (MANDATORY)
   - update DCC
   - keep the workflow diagram unless product truth changes
   - keep explicit module percentages
   - keep the remaining PR roadmap visible
   - only move Orders / Execution to 97%+ if:
     - snapshot exists
     - immutability enforced
     - no fallback derivation

Files:
- public/internal-dcc/index.html
- src/app/(app)/orders/*
- src/features/contracts/*
- src/features/quotes/*
- mitigation/supabase/sql/*
- NEXT_PROMPT.md

Return:
1. Updated repo zip
2. Updated DCC
3. PR-FINISH-05 summary
4. Updated readiness
5. Remaining blockers
6. Next PR-FINISH step
