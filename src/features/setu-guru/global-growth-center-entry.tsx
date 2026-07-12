'use client';

/**
 * The Growth Center entry now belongs to the real AppShell header.
 * This legacy portal remains as a no-op so older imports cannot create a
 * second global button while Sprint 47 is being hardened.
 */
export function GlobalGrowthCenterEntry() {
  return null;
}
