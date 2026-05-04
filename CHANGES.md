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
