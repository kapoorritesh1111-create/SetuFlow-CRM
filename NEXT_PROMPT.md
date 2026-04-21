# Follow-up prompt — PR-FINISH-04 orders / execution proof lock

You are continuing the Setu Flow CRM final production readiness pass from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, release recommendation, and workflow direction.

Immediate objective:
Execute PR-FINISH-04: Orders / execution immutability + contract handoff proof.

Goal:
Push Orders / Execution from strong to truly defensible by making accepted-quote handoff, commercial lock continuity, and execution-state truth feel as provable as the quote lane.

Focus:
Do not widen scope. Finish the execution proof layer.

Scope:
1. Accepted-quote handoff proof
   - make it explicit which accepted quote version seeded the order / contract record
   - show the exact commercial handoff source in the execution workspace
   - remove any ambiguity between quote header truth and locked commercial line truth

2. Commercial lock continuity
   - prove that execution reads locked commercial lines, not mutable draft state
   - make override posture, locked pricing basis, and approval continuity visible at handoff
   - call out honestly if any execution view still falls back to weaker quote-level state

3. Execution state completeness
   - cover empty, loading, blocked, ready, in-progress, completed, and exception / recovery states
   - make blockers explicit and machine-readable where the repo supports them

4. Contract / order immutability cues
   - make it obvious what is editable vs locked after acceptance
   - remove any chance that operators confuse execution updates with commercial rewrites

5. AI support at execution decision points
   - embed AI as operational guidance only
   - it may explain readiness / risk / missing evidence
   - it must not invent execution proof or mutate commercial lock truth

6. DCC integrity update (mandatory)
   - update DCC in this pass
   - only increase Orders / Execution if handoff proof and lock continuity are actually complete in repo code
   - keep Approval / Send at 97% unless a real governed margin source appears in the repo

Files to inspect and update:
- public/internal-dcc/index.html
- src/app/(app)/orders/*
- src/features/contracts/*
- src/features/quotes/*
- src/app/(app)/integrations/*
- src/features/ai*
- NEXT_PROMPT.md

Return:
1. Updated repo zip
2. Updated DCC
3. PR-FINISH-04 summary
4. Updated readiness
5. Explicit remaining blockers
6. Next PR-FINISH step
