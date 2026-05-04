# Mobile Scan Production Setup

This root scan note is retained because release tests verify the production scanner contract here. The consolidated release summary lives in `docs/CURRENT_RELEASE_STATUS.md`.

## Required variables

```env
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://www.setuflowcrm.com
NEXT_PUBLIC_SITE_URL=https://www.setuflowcrm.com
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=true
FEATURE_MOBILE_APP_V1=true
```

## Recommended current provider

```env
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
```

Expected readiness state includes `activeProvider` reporting `openai-vision` when OpenAI Vision direct image scanning is configured.

## Optional Google Vision comparison provider

```env
CONTACT_SCAN_PROVIDER=google-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
GOOGLE_CLOUD_VISION_API_KEY=
```

When Google Vision is configured as primary, readiness should show `activeProvider` as `google-vision+openai` because OCR extraction uses Google Vision and mapping falls back to OpenAI.

## Readiness and smoke test

Readiness endpoint:

```text
/api/mobile/scan-readiness
```

Phone smoke route:

```text
/leads?quickLead=1
```

Expected operator flow:

1. Open Quick Add Lead on a signed-in phone session.
2. Capture or upload a business card image.
3. Verify scan progress appears immediately.
4. Review mapped fields before save.
5. Save the lead and use Email, WhatsApp, or Share vCard follow-up actions where available.
