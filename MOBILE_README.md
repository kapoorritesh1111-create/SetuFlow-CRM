# SETU Flow Mobile Experience

This root mobile note is intentionally short so active documentation stays consolidated. Current repo baseline is current baseline. See `README.md`, `docs/PRODUCT_OVERVIEW.md`, `docs/CURRENT_RELEASE_STATUS.md`, and `public/internal-dcc/index.html` for the current full handoff.

The mobile experience is additive and isolated from the desktop app. It supports signed-in operators on phone viewports with mobile-safe Home, Leads, Capture, Quote, Orders, Notifications, Settings, Quick Add Lead, and Share vCard flows.

## Key principles

- Signed-in identity is preserved across mobile shell surfaces.
- Share vCard uses saved My Card settings.
- Canonical desktop routes such as `/dashboard`, `/leads`, and `/orders` can render mobile-safe views on phone widths without replacing the desktop workspace.
- Mobile capture supports direct card/photo scan review before save.

## Current docs

- `docs/DOCUMENT_INDEX.md`
- `docs/PRODUCT_OVERVIEW.md`
- `docs/CURRENT_RELEASE_STATUS.md`
- `public/internal-dcc/index.html`
