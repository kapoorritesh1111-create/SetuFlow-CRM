# Mobile Scan Production Setup

_Last updated: 2026-05-05_

This document tracks production setup for mobile business-card/contact scanning.

## Provider modes

### OpenAI Vision direct mode

Use this for the investor/demo path when image understanding should go directly to OpenAI Vision.

```bash
CONTACT_SCAN_PROVIDER=openai-vision
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=
```

Expected readiness shape includes `activeProvider` containing `openai-vision`.

### Google Vision OCR with OpenAI mapper fallback

Use this when Google Vision should perform OCR and OpenAI should map extracted text into contact fields.

```bash
CONTACT_SCAN_PROVIDER=google-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
GOOGLE_CLOUD_VISION_API_KEY=
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=
```

Expected readiness shape includes `activeProvider` containing `google-vision+openai`.

## Required production variables

```bash
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=
CONTACT_SCAN_PROVIDER=
CONTACT_SCAN_FALLBACK_PROVIDER=
GOOGLE_CLOUD_VISION_API_KEY=
```

## Readiness endpoint

Use:

```text
/api/mobile/scan-readiness
```

The endpoint should expose safe, non-secret checks only. It must never return raw API keys.

## Lead handoff route

Successful capture can route into:

```text
/leads?quickLead=1
```

## Verification

```bash
npm run check:mobile-scan-prod
npm test
```

Reference HTML scan blueprints are paused and removed from the active repo; this Markdown file is now the production scan setup source.
