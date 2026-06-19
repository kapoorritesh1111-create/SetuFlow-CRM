# Docs Hub feels like part of SMC (not a second app)

## Problem
/smc/wiki renders the SMC header + share controls, then iframes the full static
Documentation Hub. That static app carries its OWN dark top bar (its own brand,
global search, and cross-app links: Issue Tracker / Roadmap / Pre-Demo / QA Tests /
Share Doc / Live CRM) plus its own layout offsets. Result inside SMC: two stacked
headers and a second product chrome -> reads as a separate workspace.

## Fix (surgical, additive)
A new SMC-embedded mode on the docs app, triggered by a URL flag on the iframe.
- src/app/smc/wiki/page.tsx -> iframe src is now `/internal/setuflow-docs.html?in=smc`.
  ("Open in new tab" still points at the plain URL = full standalone chrome.)
- setuflow-docs-workspace.js -> initAuth() adds `smc-embed` to <body> when
  `?in=smc` (or `?embed=1`) is present.
- setuflow-docs-surgical-fixes.css -> `body.smc-embed` hides the docs `.topbar`,
  removes the topbar offsets on `.shell` / `.left-nav` / `.right-rail`, hides the
  redundant `.nav-footer` cross-links, and matches SMC's content background (#f1f5f9).
  The docs' dark left-nav stays — it already matches SMC's dark rail.

Net: inside SMC you now get one header (the SMC "Documentation Hub" header), the
share controls, then the docs content flush in the pane — no second app bar.

## Unaffected
- Standalone (Open in new tab) keeps full chrome.
- External shared links (/docs/<token> -> ?share_token=...) keep shared-mode chrome.
- No DB changes. No behavior changes to navigation, search, or content.

## Apply / verify
Overwrite the 3 files, `tsc --noEmit` (only page.tsx is TS; trivial), deploy.
Then open /smc/wiki: expect a single header and the docs body sitting in the SMC
pane with no dark second top bar. Confirm "Open in new tab" still shows the full app.
