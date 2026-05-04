
## V14 - iPhone vCard import polish

- Added structured `N:` name fields so iOS displays the full contact name instead of falling back to the phone number.
- Tightened vCard output to iOS-friendly fields: name, organization, title, cell phone, email, website, address, note, and revision.
- Kept the public card URL out of visible contact fields.
- Reduced future profile-photo crop output to a smaller square JPEG so iOS is more likely to import the contact photo reliably.
- Added size guard for embedded vCard photos to avoid iOS silently rejecting oversized images.

# Setu Flow vCard QR Hotfix V11

## Fixed
- Removed inline phone-uploaded avatar data URLs from all public card, QR, and .vcf links.
- Fixed `URI_TOO_LONG` errors when downloading `.vcf` files after uploading a profile photo.
- Fixed broken share modal QR by keeping QR payloads compact and stable.
- Fixed My Card settings QR so it renders a real QR code instead of a huge text destination.
- Public card save-contact links now rebuild compact `.vcf` URLs from safe contact fields.
- Global header vCard share links now skip large inline avatar data safely.

## Notes
- Uploaded profile photos still show inside the signed-in product and share modal.
- Public card links use saved share slugs when available; otherwise they use compact fallback query params without large image payloads.

## V12 — Smart vCard sharing architecture

- Default QR now opens the public profile card instead of the raw `.vcf` endpoint.
- Header share modal now uses clean `/card` public links for QR, copy, email, and native share.
- Signed-in shell now prefers saved share slugs, so uploaded profile photos load from the public card instead of being embedded into URLs.
- Added Smart QR / Offline QR toggle on My Card settings: Smart opens the public card; Offline points directly to the `.vcf` contact download.
- Added lightweight public card analytics pixel for view/QR source tracking via `audit_logs` when a share slug is available.
- Added Open Graph metadata for public cards so mobile share previews use the card/profile context instead of a generic page.
- Added Apple Wallet / Google Wallet icon actions with stable wallet-ready endpoints for future pass-provider credentials.

## V13 — vCard mobile contact polish

- Kept Smart QR as the default public-card link and clarified modal copy to “Scan to open card.”
- Cleaned `.vcf` generation so saved iPhone/Android contacts no longer show the Setu Flow public-card URL as an ugly work field.
- Added compressed profile photo support in generated `.vcf` files when the saved avatar is available as an optimized data image.
- Reordered and relabeled share actions to feel more contact-first: Save contact, Copy link, Share card, Send email.
- Added the provided Apple Wallet and Google Wallet icon assets across desktop modal, mobile sheet, My Card settings, and public card.
- Preserved wallet actions as premium pass placeholders until Apple `.pkpass` certificates and Google Wallet issuer credentials are connected.
