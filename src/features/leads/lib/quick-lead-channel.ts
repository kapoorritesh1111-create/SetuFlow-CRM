// S24-TRIAL-206 Pass D: Quick Lead open-signal channel.
//
// Root fix for the duplicate-drawer bug: LeadsWorkspace is the SOLE owner of
// the Quick Lead drawer state. When the user is already on /leads, the header
// button calls openQuickLeadDrawer() instead of navigating — no second render
// path, no URL round-trip, no portal pruning needed.
//
// This is a plain module-level pub/sub with zero browser-API coupling and no
// context plumbing through AppShell. Off /leads, triggers still navigate
// with ?quickLead=1, which LeadsWorkspace consumes once and clears.

type QuickLeadListener = () => void;

const listeners = new Set<QuickLeadListener>();

/** Fired by Quick Lead triggers when the user is already on /leads. */
export function openQuickLeadDrawer() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One bad listener must never block the drawer for others.
    }
  });
}

/** Subscribed by LeadsWorkspace — the only component that opens the drawer. */
export function subscribeQuickLeadDrawer(listener: QuickLeadListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// S24-TRIAL-206 (critical fix): drawer-opened broadcast.
// The lead drawer announces the moment it actually opens (after winning the
// singleton claim). The trial tour subscribes and closes itself immediately —
// the guide popover and the drawer can never be on screen together, which is
// what read as "two open Quick Lead drawers" in production.
// ---------------------------------------------------------------------------

const drawerOpenedListeners = new Set<QuickLeadListener>();

/** Called by LeadDrawer when it opens as the primary instance. */
export function notifyLeadDrawerOpened() {
  drawerOpenedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One bad listener must never block the others.
    }
  });
}

/** Subscribed by surfaces that must yield to the drawer (e.g., the trial tour). */
export function subscribeLeadDrawerOpened(listener: QuickLeadListener): () => void {
  drawerOpenedListeners.add(listener);
  return () => {
    drawerOpenedListeners.delete(listener);
  };
}
