# S51-GROWTH-053 — SMC Growth outreach parity

## Problem

Lead Manager displayed the full Growth lifecycle, but Mailtrap Outreach silently excluded `converted` and `lost` records. Lead Manager also used a legacy email/mailto experience instead of the same Setu Guru + Mailtrap workflow available under `/smc/leads/outreach`.

## Resolution

- Mailtrap Outreach now receives the same Growth lead population as Lead Manager.
- Converted/lost records remain visible for parity and one-to-one communication, but are excluded from automatic bulk prospect selection.
- Pipeline stage is visible in the Mailtrap lead list so lifecycle context is clear.
- Lead Manager exposes a Mailtrap email action on each email-ready lead card and in the opened lead drawer.
- The Lead Manager composer supports Auto / First Inquiry / Follow-up, Setu Guru generation, editable subject/body, and direct Mailtrap delivery.
- The existing `/api/smc/leads/:id/outreach` endpoint remains the single send path, preserving first-inquiry marketing-link enforcement and activity logging.
- Successful sends refresh the Lead Manager contact state so the latest email activity is visible without switching workspaces.

## Safety

Bulk selection intentionally excludes converted/lost records. Those records remain available for deliberate one-to-one email from either Growth workspace.

No database schema change is required.
