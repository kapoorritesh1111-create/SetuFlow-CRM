# PASS24 — Quick Add Camera Prefill Hotfix

## Summary

Fixed the Quick Add Lead drawer scan path so camera/file capture no longer dispatches to a non-existent hidden upload input. The visible Quick Add Lead form now calls the production contact scan server action directly and writes the extracted OCR draft into the same buyer/supplier form fields the user sees before save.

## User-reported failure

On mobile, tapping **Use camera** opened the phone camera, but after taking a business-card picture the drawer stayed blank. This blocked the buyer quick-entry use case because the OCR result never populated Company, Contact, Job Title, Email, Phone, Website, Notes, or provenance fields.

## Code changes

- `src/features/leads/components/lead-drawer.tsx`
  - Imports `extractContactScan` directly.
  - Adds `quickScanStatus` so the drawer shows loading, success, and error feedback inline.
  - Adds `applyQuickScanExtraction(file, sourceMode)` to send the selected photo/PDF to the scan server action.
  - Maps the returned OCR draft into the visible drawer state:
    - `companyName`
    - `contactName`
    - `jobTitle`
    - `email`
    - `phone`
    - `whatsappNumber`
    - `phoneSecondary`
    - `website`
    - `notes`
    - `sourceType`
    - `sourceLabel`
    - `countryId` when the scan text contains a configured country name
  - Removes the broken `ql-hidden-upload` dispatch path.

- `tests/mobile-business-card-scan.test.mjs`
  - Adds a regression test proving Quick Add Lead camera scan calls `extractContactScan`, maps OCR values into visible form setters, shows scan status, and no longer depends on `ql-hidden-upload`.

## Expected mobile behavior

1. Open Quick Add Lead.
2. Confirm Buyer is selected.
3. Tap **Use camera**.
4. Take a business-card photo.
5. Drawer shows `Preparing photo for secure mobile scan…`.
6. Drawer then shows `Lead details filled from scan. Review the highlighted fields before saving.`
7. The visible form fields are populated before Save.

## Verification

Static regression test target:

```bash
node --test tests/mobile-business-card-scan.test.mjs tests/mobile-scan-production-config.test.mjs tests/mobile-scan-upload-limit.test.mjs
```

Build/typecheck could not be rerun in this container because dependency installation timed out before Next/TypeScript binaries became available. The change is localized to the existing client drawer and reuses the production server action that is already used by the existing scan components.
