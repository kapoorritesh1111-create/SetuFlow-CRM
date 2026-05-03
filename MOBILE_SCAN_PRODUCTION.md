# Mobile Card Scan Production Setup

## Current recommended mode

For the current SaaS demo, use direct OpenAI Vision for card photos:

```env
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
```

Keep Supabase and public app URL variables configured:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://www.setuflowcrm.com
NEXT_PUBLIC_SITE_URL=https://www.setuflowcrm.com
FEATURE_MOBILE_APP_V1=true
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=true
```

## Readiness check

Open:

```text
https://www.setuflowcrm.com/api/mobile/scan-readiness
```

Expected scanner values:

```json
{
  "requestedProvider": "openai-vision",
  "activeProvider": "openai-vision",
  "fallbackProvider": "openai"
}
```

## User flow

1. Open `/leads?quickLead=1` on a phone.
2. Tap **Use camera** or **Upload file or PDF**.
3. Keep the drawer open while SETU Flow reads the card.
4. Review the filled values.
5. Save the lead.

## Operational notes

- Phone photos are converted to JPEG before upload.
- Large images are compressed before scan.
- Uploaded PDFs remain limited to the safe production upload size.
- Google Vision can remain configured for future comparison, but it is not required for the current OpenAI Vision demo mode.

## Troubleshooting

- If readiness does not show `openai-vision`, check `CONTACT_SCAN_PROVIDER` and redeploy.
- If scan fails, retake the photo closer to the card with less glare.
- If Vercel environment variables were changed, redeploy production with a cleared build cache.

## Optional Google Vision comparison mode

The repo also keeps the Google Vision provider for future comparison testing:

```env
CONTACT_SCAN_PROVIDER=google-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
GOOGLE_CLOUD_VISION_API_KEY=
```

When this mode is active, readiness reports `activeProvider` as `google-vision+openai`.
