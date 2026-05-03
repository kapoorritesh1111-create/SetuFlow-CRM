# SETU Flow Mobile Scan Production Setup

## Current recommended startup scanner

Use Google Cloud Vision OCR as the primary photo OCR layer and OpenAI as the field mapper/fallback:

```env
CONTACT_SCAN_PROVIDER=google-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
GOOGLE_CLOUD_VISION_API_KEY=<restricted Cloud Vision API key>
OPENAI_API_KEY=<OpenAI API key>
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
```

Why: Google Vision is strong and low-cost for reading text from phone photos. OpenAI is better used after OCR to map raw text into SETU Flow fields such as company, contact, title, email, phone, website, and notes.

## Required Vercel variables

Add these to **Vercel → Project → Settings → Environment Variables** for **Production**:

```env
CONTACT_SCAN_PROVIDER=google-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_vision_api_key
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

## Google Cloud checklist

1. Open Google Cloud Console.
2. Select the same project where the API key was created.
3. Enable **Cloud Vision API**.
4. Create or edit an API key.
5. Restrict the key to **Cloud Vision API**.
6. Copy the key into Vercel as `GOOGLE_CLOUD_VISION_API_KEY`.
7. Set `CONTACT_SCAN_PROVIDER=google-vision`.
8. Set `CONTACT_SCAN_FALLBACK_PROVIDER=openai`.
9. Redeploy production after saving env variables.

## How to verify after deploy

Open:

```text
https://www.setuflowcrm.com/api/mobile/scan-readiness
```

Then test the camera scan on a **real iPhone or Android device**. Browser emulators can simulate the viewport, but they do not fully reproduce the mobile camera/file handoff.

The scanner block should show:

```json
{
  "requestedProvider": "google-vision",
  "activeProvider": "google-vision+openai",
  "fallbackProvider": "openai"
}
```

If it still says only `openai`, then the deployed build is not using the Google-enabled code or Vercel has not redeployed since the env variables were added.

## How photo scan should work

```text
Use camera
→ take photo
→ browser prepares/compresses image
→ /api/mobile/contact-scan
→ Google Vision TEXT_DETECTION reads raw text
→ OpenAI maps raw text to CRM fields
→ SETU Flow fills visible Quick Add Lead fields
→ user reviews
→ Save lead
```

PDF scan may work before photo scan because PDFs often have a readable text layer. Camera photos require the Vision OCR path to be active.

## Troubleshooting

- If readiness says `openai` only: deploy the latest Google-enabled repo and redeploy after adding variables.
- If readiness says `google-vision` but scan fails: check Vercel function logs for `/api/mobile/contact-scan` and Google Cloud API key restrictions.
- If Vision returns text but fields are weak: OpenAI fallback may be missing or disabled.
- If the photo is dark, angled, glossy, or too far away: retake closer and flatter, or use Upload file with a cropped image.
