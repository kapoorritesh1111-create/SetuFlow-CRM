# Follow-up prompt — post PR-UX-08 release decision audit

You are continuing the Setu Flow CRM brutal UX review from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, release recommendation, and workflow direction.

Immediate objective:
Run a post PR-UX-08 release decision audit.

Mandatory first step:
Update public/internal-dcc/index.html FIRST.

Scope:
1. Verify whether the repo proves the current DCC release recommendation or whether it is still too generous.
2. Inspect the remaining debt called out in the DCC:
   - Capture handoff compression
   - Approval / Send confidence at send time
   - Orders / Execution proof depth
   - Catalog / Settings / Admin finish quality
   - AI embedded guidance
3. Keep workflow confidence labels honest in the DCC:
   - Core workflow
   - Support surface
   - Mixed / unclear workflow
4. Preserve the governed commercial contract intact:
   - catalog/base pricing stays default
   - override requires reason
   - approval remains required when threshold is met
5. Return an explicit recommendation:
   - ship internally
   - ship for guided external demos
   - hold for another pass
6. Be brutal: if the repo does not prove a claim in the DCC, lower the claim.

Files to inspect and update:
- public/internal-dcc/index.html
- src/app/(app)/*
- src/features/*
- src/components/layout/*
- src/lib/routes/manifest.json
- NEXT_PROMPT.md

Return:
1. Updated full repo zip
2. Updated DCC
3. Release decision audit summary
4. Updated readiness by module
5. Remaining UX debt
6. Brutal notes on what is still broken
7. Final ship / hold recommendation
