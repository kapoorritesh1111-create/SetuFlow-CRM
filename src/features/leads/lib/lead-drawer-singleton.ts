// S24-TRIAL-206 (hotfix): Lead drawer singleton claim registry.
//
// INVARIANT ENFORCED: at most ONE lead drawer renders its portal at any time,
// no matter how many LeadDrawer instances any present or future code mounts
// (duplicate workspace mounts, App Router transition tree retention, hidden
// CSS trees whose portals still reach the page body, etc.).
//
// Mechanism — pure React/JS, zero DOM reads or mutations:
// - An OPEN LeadDrawer claims primacy with a stable per-instance token.
// - If another instance already holds the claim, the newcomer renders null,
//   so its portal is NEVER created (this is prevention, not pruning).
// - When the primary releases (closes/unmounts), waiting instances are
//   notified and the first to re-claim becomes primary — self-healing, so a
//   suppressed-but-open drawer appears the moment the slot frees up.
//
// This guards the invariant at the component that owns form#lead-drawer-form,
// which is why the bug class cannot resurface through new mount sites.

type ReleaseListener = () => void;

let activeOwner: symbol | null = null;
const releaseListeners = new Set<ReleaseListener>();

/** Attempt to become the single rendering lead drawer. Idempotent per owner. */
export function claimLeadDrawerPrimacy(owner: symbol): boolean {
  if (activeOwner === null || activeOwner === owner) {
    activeOwner = owner;
    return true;
  }
  return false;
}

/** Release the claim. Notifies suppressed instances so one can take over. */
export function releaseLeadDrawerPrimacy(owner: symbol): void {
  if (activeOwner !== owner) return;
  activeOwner = null;
  releaseListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A faulty listener must never block the handoff for others.
    }
  });
}

/** Subscribe to claim releases (used by suppressed instances to retry). */
export function onLeadDrawerPrimacyReleased(listener: ReleaseListener): () => void {
  releaseListeners.add(listener);
  return () => {
    releaseListeners.delete(listener);
  };
}

/** Test/diagnostic helper. */
export function hasActiveLeadDrawerClaim(): boolean {
  return activeOwner !== null;
}
