# SETU Flow Mobile Scan Production Setup

This checklist makes camera capture and file-based business-card scan work in production.

## Required production variables

Add these in Vercel Project Settings -> Environment Variables for **Production** and **Preview**, then redeploy.

| Variable | Required | Purpose |
|---|---:|---|
| `OPENAI_API_KEY` | Yes | Enables automatic OCR for business-card photos, images, and scanned PDFs. |
| `OPENAI_CONTACT_SCAN_MODEL` | Recommended | OCR model for contact scan. Defaults to `gpt-4.1-mini`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase client connection. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase browser auth/client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side contact scan save path. Keep this secret. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Stable public vCard and QR links. Example: `https://www.setuflowcrm.com`. |
| `NEXT_PUBLIC_FEATURE_MOBILE_APP_V1` | Recommended | Explicitly enables the premium mobile shell. Set to `true`. |
| `FEATURE_MOBILE_APP_V1` | Recommended | Server-side companion flag. Set to `true`. |

## Production camera requirements

- Camera capture must run on **HTTPS**. It will not reliably open the device camera from plain HTTP.
- Test with a real iPhone or Android device. Desktop device emulation can show the mobile viewport, but it does not fully reproduce mobile camera behavior.
- The scanner input accepts `image/*` and `application/pdf` and uses `capture="environment"` to prefer the rear camera.
- Keep card scans under 10 MB.

## Verify after deploy

1. Redeploy production after adding environment variables.
2. Open this endpoint in production:

```text
https://www.setuflowcrm.com/api/mobile/scan-readiness
```

3. Confirm the JSON response has `ok: true` and the following checks are passing:
   - `secure-context`
   - `openai-ocr`
   - `mobile-flag`
   - `supabase-client`
   - `supabase-server`
4. On a real phone, open:

```text
https://www.setuflowcrm.com/leads?quickLead=1
```

5. Tap **Take or upload business card photo**.
6. Take a new photo or choose an existing business-card image.
7. Tap **Scan business card**.
8. Confirm the fields prefill before saving:
   - contact name
   - company
   - title
   - email
   - phone
   - website
   - notes

## Local / CI readiness check

Run this with production-like environment variables loaded:

```bash
npm run check:mobile-scan
```

The command fails if required variables are missing.

## Troubleshooting

### Camera opens but fields do not prefill

Most likely `OPENAI_API_KEY` is missing from the deployed environment, the deployment was not redeployed after adding it, or the card image is too blurry. Check `/api/mobile/scan-readiness` first.

### Upload works but Save fails

Check Supabase variables. The scan can OCR successfully but lead save can fail if Supabase auth/server variables are missing or invalid.

### Works locally but not on production domain

Confirm the production domain is HTTPS and that environment variables were added to the same Vercel project/environment that is serving the domain. Redeploy after every environment variable change.

### A PDF accepts but does not extract text

Image-only scanned PDFs require the OpenAI OCR provider. Embedded-text PDFs can be read through the text layer even without OCR.
