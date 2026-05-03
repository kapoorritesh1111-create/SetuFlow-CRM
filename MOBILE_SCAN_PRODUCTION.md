# SETU Flow Mobile Scan Production Setup

## PASS30 investor-demo scanner

For the investor demo, use direct OpenAI Vision as the primary photo reader:

```env
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
OPENAI_API_KEY=<OpenAI API key>
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
```

Why: the camera photo is sent directly to OpenAI Vision, which is the closest production path to the way ChatGPT can read a business-card image in conversation. It avoids the weaker handoff where Google OCR extracts raw text first and then another mapper tries to reconstruct the card fields.

Keep Google Vision configured for future production comparison, but it is not active while `CONTACT_SCAN_PROVIDER=openai-vision`:

```env
GOOGLE_CLOUD_VISION_API_KEY=<restricted Cloud Vision API key>
```


## Future low-cost production comparison

After the investor demo, you can compare the Google Vision pipeline again by switching:

```env
CONTACT_SCAN_PROVIDER=google-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_vision_api_key
```

That path should report `activeProvider: google-vision+openai` in readiness when configured.

## Required Vercel variables

Add these to **Vercel → Project → Settings → Environment Variables** for **Production**:

```env
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=true
FEATURE_MOBILE_APP_V1=true
NEXT_PUBLIC_APP_URL=https://www.setuflowcrm.com
NEXT_PUBLIC_SITE_URL=https://www.setuflowcrm.com
```

Keep your existing Supabase variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional but recommended for later provider testing:

```env
GOOGLE_CLOUD_VISION_API_KEY=...
```

## How to verify after PASS30 deploy

Open:

```text
https://www.setuflowcrm.com/api/mobile/scan-readiness
```

The scanner block should show:

```json
{
  "requestedProvider": "openai-vision",
  "activeProvider": "openai-vision",
  "fallbackProvider": "openai"
}
```

You should also see a readiness check named `openai-vision-reader` with `ok: true`.

Test the camera flow on a real iPhone or Android device; desktop emulators do not reproduce the full camera/file handoff.

If readiness still says `google-vision`, then the PASS30 repo is not deployed, `CONTACT_SCAN_PROVIDER` is still set to `google-vision`, or the Vercel production deployment was not redeployed after saving the variable.

## How photo scan should work

```text
Use camera
→ take photo
→ browser prepares/compresses image
→ /api/mobile/contact-scan
→ OpenAI Vision reads the card image directly
→ SETU Flow fills visible Quick Add Lead fields
→ user reviews
→ Save lead
```

PDF scan can continue to use the existing path because it already works well. PASS30 mainly improves live camera/photo card reading.

## Troubleshooting

- If readiness says `google-vision`: change `CONTACT_SCAN_PROVIDER=openai-vision` and redeploy production.
- If readiness says `openai-vision` but scan fails: check Vercel function logs for `/api/mobile/contact-scan` and confirm `OPENAI_API_KEY` is valid.
- If fields are still weak: retake closer and flatter, avoid glare, and make the card fill most of the photo.
- If scan fills no useful fields: the app should show a clear retake/upload message instead of saving garbage values.

## PASS31 camera-photo fix

If `/api/mobile/contact-scan` returns `422` while readiness is green, deploy PASS31. PASS31 keeps `CONTACT_SCAN_PROVIDER=openai-vision`, but changes the client and server scan path:

1. Camera/image files are converted to JPEG before upload, so iPhone/Android camera formats do not fail the OpenAI image endpoint.
2. OpenAI image reading uses high detail for business-card text.
3. If the primary Responses API vision call fails, the route retries through Chat Vision with the same schema.
4. The sticky Quick Add Lead footer shows scan progress and errors without needing to press Cancel.

After deployment, retest with a real photo and then check Vercel function logs for `/api/mobile/contact-scan` only if the UI still shows an error. The error should now include the provider failure detail.
