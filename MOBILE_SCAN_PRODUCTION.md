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
- Photos can be selected up to 10 MB. The mobile client now optimizes phone photos before upload so the server request stays under production payload limits. PDFs should be under 3 MB, or users should take a photo of the card instead.

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

If `/api/mobile/scan-readiness` is already `ok: true`, the most common production blocker is upload size: phone photos are often larger than Server Action and Vercel Function payload limits. This build optimizes large images on-device before sending them. Redeploy this version, then test with a fresh card photo. If it still fails, open browser dev tools or Vercel function logs and look for `413`, `FUNCTION_PAYLOAD_TOO_LARGE`, or `body exceeded` errors.

### Upload works but Save fails

Check Supabase variables. The scan can OCR successfully but lead save can fail if Supabase auth/server variables are missing or invalid.

### Works locally but not on production domain

Confirm the production domain is HTTPS and that environment variables were added to the same Vercel project/environment that is serving the domain. Redeploy after every environment variable change.

### A PDF accepts but does not extract text

Image-only scanned PDFs require the OpenAI OCR provider. Embedded-text PDFs can be read through the text layer even without OCR.


## Upload-size guardrail added in this build

Production scan now uses two layers of protection:

1. `next.config.mjs` sets Server Actions to a 4 MB body budget.
2. `MobileBusinessCardScanner` compresses phone images to a JPEG under roughly 3 MB before calling the scan action.

This is necessary because production functions cannot safely receive full-size phone camera photos. The readiness endpoint can confirm keys and flags, but it cannot prove that the selected camera image was small enough to reach the OCR action. The mobile UI now shows when a photo is being prepared and when it was optimized.

## Quick Add Lead drawer scan behavior

The production readiness endpoint only verifies environment and service configuration. The live mobile drawer also needs the UI prefill path to complete. The current Quick Add Lead implementation now:

- prepares large phone photos before OCR,
- adds browser text-detection assist text where supported,
- calls the server OCR action directly from the visible drawer,
- treats scan success as valid only when at least one structured lead field is found,
- writes the result into the visible Company, Contact, Job Title, Email, Phone, WhatsApp, Website, Source, and Notes fields,
- scrolls the drawer to the Company field after the form is populated.

If a business card still does not prefill, the status banner should show a specific error instead of a false success message.
