'use client';

// Coverage workflows must pass LeadCoverageManager an explicit leadId from the
// selected lead object. This boundary used to intercept Lead CC / Quote Builder
// clicks and infer context from DOM text, company names, select values, and
// window globals. Keeping it inert prevents those fallback paths from becoming
// the primary coverage flow again.
export function LeadCoverageRecoveryBoundary() {
  return null;
}
