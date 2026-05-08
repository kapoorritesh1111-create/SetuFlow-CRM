'use client';

/**
 * Deprecated safety shim.
 *
 * Earlier Sprint 6 attempts used this client component to mutate the rendered
 * Quote Review and Send Gate DOM after the page loaded. That made the workflow
 * appear clear in some places while other source-of-truth cards still showed
 * blockers, and it could also collapse/blank parts of the Send Gate panel.
 *
 * Keep this exported component as a no-op so existing imports keep compiling
 * while the actual fix remains inside the real inline LeadsWorkspace state and
 * server-side gate data paths.
 */
export function QuoteReviewInlineComplianceFix() {
  return null;
}
