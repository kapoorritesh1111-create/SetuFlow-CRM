# WAF Deployment Evidence Checklist — Pass 8

Date: 2026-04-30

This is an evidence checklist. It does not claim a WAF is deployed.

## Required WAF / rate-limit evidence

For each protected route or area, collect:

- Provider/project name
- Rule name
- Protected route pattern
- Rate-limit values and window
- Bot/abuse rule configuration
- Screenshot or provider export
- Test request evidence showing block/throttle behavior
- Owner
- Review cadence

## Route evidence table

| Route / Area | Rule needed | Evidence required | Owner | Status |
|---|---|---|---|---|
| Login/auth | Per-IP and bot protection | Provider rule export, failed-login throttling test | Vercel/Supabase admin | Needed |
| Public card intake | Per-IP, bot, payload size controls | Rule export, abuse simulation result | Vercel admin | Needed |
| Quote share/public quote routes | Public access abuse controls | Route list, rate-limit evidence, access test | Technical owner | Needed |
| Product upload/spreadsheet ingestion | Upload size/type and per-user limits | Upload limit config, blocked oversize test | Technical owner | Needed |
| Order document upload | Authenticated per-user limits, type/size controls | Upload config, blocked invalid file test | Technical owner | Needed |
| Admin invitation routes | Per-user and per-IP limits | Invite spam throttle test, audit log evidence | Technical owner | Needed |
| AI routes if present | Per-user token/cost limits and abuse controls | Rule export, quota test | Technical owner | Needed if enabled |
| Webhook/integration routes | Signature validation, per-provider limits | Signature test, replay rejection evidence | Technical owner | Needed if enabled |

## Review cadence

- Review WAF rules before pilot launch.
- Review after every new public route or upload path.
- Review monthly during pilot operation.
- Re-test after provider configuration changes.

## Non-claims

- No deployed WAF proof exists unless provider evidence is attached.
- No SIEM exists unless configured and evidenced.
- No DDoS-specific proof exists unless provider-level evidence is captured.
