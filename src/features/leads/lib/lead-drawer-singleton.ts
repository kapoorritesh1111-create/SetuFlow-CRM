// Lead drawer singleton claim registry.
//
// INVARIANT ENFORCED: at most ONE lead drawer renders its portal at any time,
// no matter how many LeadDrawer instances are mounted by responsive hidden
// trees, App Router retention, or duplicated workspace surfaces.
//
// Important mobile rule: a suppressed duplicate must NOT automatically take
// over when the visible drawer is closed. Canonical mobile routes can contain
// a hidden desktop workspace instance; automatic handoff made that hidden
// instance appear as a second Quick Lead immediately after the first drawer
// closed. A newly mounted/opened drawer can still claim the now-free slot on
// its normal open lifecycle.

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

/**
 * Release the active claim without promoting a suppressed duplicate.
 * The next legitimate open/mount lifecycle claims the free slot normally.
 */
export function releaseLeadDrawerPrimacy(owner: symbol): void {
  if (activeOwner !== owner) return;
  activeOwner = null;
}

/**
 * Compatibility subscription for existing drawer wiring. Suppressed instances
 * remain registered only for lifecycle compatibility; close no longer emits a
 * takeover event because that recreated the duplicate-drawer bug on mobile.
 */
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
