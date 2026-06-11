'use client';

// S24-TRIAL-204 Pass B: React-controlled guided tour for trial workspaces.
// Mounted from (app)/layout.tsx ONLY when capability.guided_mode_enabled, so
// non-trial orgs ship zero tour code paths at runtime.
//
// Hard rules honored (per S24-TRIAL-204 / lessons from S24-TRIAL-200):
// - No DOM injection, pruning, observers, polling loops, or document-level
//   capture listeners of any kind.
// - Anchors are read via querySelector('[data-tour=...]') purely to POSITION
//   the popover; app DOM is never mutated.
// - Steps whose anchor is not present on the page are skipped automatically.
// - Persistence is limited to dismissed-tour state in localStorage.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  getTourStep,
  getTourStepsForRoute,
  type TourStep,
} from '@/lib/trial/tour-registry';
import type { TrialTemplateKey } from '@/lib/trial/capability';
import { subscribeLeadDrawerOpened } from '@/features/leads/lib/quick-lead-channel';
import { hasActiveLeadDrawerClaim } from '@/features/leads/lib/lead-drawer-singleton';

type AnchorBox = { top: number; left: number; width: number; height: number };

type TourContextValue = {
  relaunch: () => void;
  /** S24-TRIAL-205: open one specific registry step on the current page. Returns false when its anchor is not present. */
  showStep: (stepId: string) => boolean;
  active: boolean;
};

const TourContext = createContext<TourContextValue | null>(null);

function storageKey(organizationId: string, userId: string) {
  return `setuflow.trialTour.v1.${organizationId}.${userId}`;
}

function readDismissed(organizationId: string, userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(organizationId, userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeDismissed(organizationId: string, userId: string, routes: string[]) {
  try {
    window.localStorage.setItem(storageKey(organizationId, userId), JSON.stringify(Array.from(new Set(routes))));
  } catch {
    // Storage unavailable (private mode etc.) — tour simply re-offers next visit.
  }
}

function measureAnchor(anchor: string): AnchorBox | null {
  const element = document.querySelector(`[data-tour="${anchor}"]`);
  if (!(element instanceof HTMLElement)) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export function TrialTourProvider({
  organizationId,
  userId,
  templateKey,
  children,
}: {
  organizationId: string;
  userId: string;
  templateKey: TrialTemplateKey | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const guruStepParam = searchParams?.get('guruStep') ?? null;
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([]);
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);

  // S24-TRIAL-205: open a single registry step (Setu Guru "Show me").
  const showStep = useCallback((stepId: string): boolean => {
    const step = getTourStep(stepId);
    if (!step) return false;
    const box = measureAnchor(step.anchor);
    if (!box) return false;
    setVisibleSteps([step]);
    setStepIndex(0);
    setAnchorBox(box);
    setOpen(true);
    return true;
  }, []);

  const routeKey = useMemo(() => {
    const match = getTourStepsForRoute(pathname, templateKey);
    return match.length ? match[0].route : null;
  }, [pathname, templateKey]);

  const startTour = useCallback(() => {
    const steps = getTourStepsForRoute(pathname, templateKey).filter((step) => measureAnchor(step.anchor) !== null);
    if (!steps.length) return false;
    setVisibleSteps(steps);
    setStepIndex(0);
    setAnchorBox(measureAnchor(steps[0].anchor));
    setOpen(true);
    return true;
  }, [pathname, templateKey]);

  // S24-TRIAL-206 critical fix: the tour and the lead drawer are mutually
  // exclusive. The instant any lead drawer opens, the tour popover closes —
  // two simultaneous floating panels read as "two open drawers" in production.
  useEffect(() => {
    return subscribeLeadDrawerOpened(() => {
      setOpen(false);
    });
  }, []);

  // Auto-run on first visit per route. requestAnimationFrame (single, not a
  // loop) lets the page paint once so anchors are measurable.
  // S24-TRIAL-205: a guruStep param (cross-route Setu Guru "Show me") takes
  // priority — it opens that single step, then the param is stripped so
  // reload/back behaves normally.
  // S24-TRIAL-206: never auto-run while a lead drawer is already open.
  useEffect(() => {
    setOpen(false);
    if (guruStepParam) {
      const frame = window.requestAnimationFrame(() => {
        if (!hasActiveLeadDrawerClaim()) showStep(guruStepParam);
        router.replace(pathname, { scroll: false });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    if (!routeKey) return;
    const dismissed = readDismissed(organizationId, userId);
    if (dismissed.includes(routeKey)) return;
    const frame = window.requestAnimationFrame(() => {
      if (!hasActiveLeadDrawerClaim()) startTour();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [routeKey, guruStepParam, pathname, router, organizationId, userId, startTour, showStep]);

  const dismissRoute = useCallback(() => {
    if (routeKey) {
      const dismissed = readDismissed(organizationId, userId);
      writeDismissed(organizationId, userId, [...dismissed, routeKey]);
    }
    setOpen(false);
  }, [routeKey, organizationId, userId]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0) return;
      if (nextIndex >= visibleSteps.length) {
        dismissRoute();
        return;
      }
      const box = measureAnchor(visibleSteps[nextIndex].anchor);
      if (!box) {
        // Anchor left the page (filtered list, drawer closed, etc.) — skip it.
        const direction = nextIndex > stepIndex ? 1 : -1;
        goTo(nextIndex + direction);
        return;
      }
      setStepIndex(nextIndex);
      setAnchorBox(box);
    },
    [visibleSteps, stepIndex, dismissRoute],
  );

  const relaunch = useCallback(() => {
    // Re-offering also clears the dismissal for this route so a reload re-runs it.
    if (routeKey) {
      const dismissed = readDismissed(organizationId, userId).filter((item) => item !== routeKey);
      writeDismissed(organizationId, userId, dismissed);
    }
    // S24-TRIAL-206: replay yields to an open drawer (no popover underneath it).
    if (!hasActiveLeadDrawerClaim()) startTour();
  }, [routeKey, organizationId, userId, startTour]);

  const contextValue = useMemo<TourContextValue>(() => ({ relaunch, showStep, active: open }), [relaunch, showStep, open]);

  const currentStep = open && visibleSteps[stepIndex] ? visibleSteps[stepIndex] : null;

  // Popover placement: below the anchor when there is room, above otherwise.
  const popoverStyle = useMemo<React.CSSProperties | null>(() => {
    if (!currentStep || !anchorBox) return null;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const width = Math.min(330, viewportWidth - 24);
    const below = anchorBox.top + anchorBox.height + 12;
    const placeBelow = below + 190 < viewportHeight || anchorBox.top < 200;
    const top = placeBelow ? below : Math.max(12, anchorBox.top - 190 - 12);
    const left = Math.min(Math.max(12, anchorBox.left), viewportWidth - width - 12);
    return { position: 'fixed', top, left, width, zIndex: 460 };
  }, [currentStep, anchorBox]);

  const spotlightStyle = useMemo<React.CSSProperties | null>(() => {
    if (!currentStep || !anchorBox) return null;
    return {
      position: 'fixed',
      top: anchorBox.top - 6,
      left: anchorBox.left - 6,
      width: anchorBox.width + 12,
      height: anchorBox.height + 12,
      zIndex: 455,
      borderRadius: 16,
      pointerEvents: 'none',
      boxShadow: '0 0 0 3px rgba(12,127,255,0.85), 0 0 0 9999px rgba(7,18,38,0.45)',
    };
  }, [currentStep, anchorBox]);

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {currentStep && popoverStyle && spotlightStyle ? (
        <>
          <div aria-hidden style={spotlightStyle} />
          <div role="dialog" aria-label={`Trial guide: ${currentStep.title}`} style={popoverStyle} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(7,18,38,0.35)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
              Trial guide · {stepIndex + 1} of {visibleSteps.length}
            </p>
            <h3 className="mt-1 text-sm font-bold text-slate-950">{currentStep.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">{currentStep.body}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={dismissRoute} className="rounded-full px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100">
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {stepIndex > 0 ? (
                  <button type="button" onClick={() => goTo(stepIndex - 1)} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                    Back
                  </button>
                ) : null}
                <button type="button" onClick={() => goTo(stepIndex + 1)} className="rounded-full bg-slate-950 px-4 py-1.5 text-[11px] font-extrabold text-white hover:bg-slate-800">
                  {stepIndex + 1 >= visibleSteps.length ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </TourContext.Provider>
  );
}

/**
 * S24-TRIAL-205: optional accessor for the tour. Returns null when no provider
 * is mounted (non-trial orgs), so consumers can hide trial-only controls.
 */
export function useTrialTour(): TourContextValue | null {
  return useContext(TourContext);
}

/**
 * Small client button rendered inside the trial banner. Resolves the provider
 * via context; renders nothing when no provider is mounted (non-trial orgs)
 * or when the current page has no tour steps to offer.
 */
export function TrialTourRelaunchButton() {
  const context = useContext(TourContext);
  if (!context) return null;
  return (
    <button
      type="button"
      onClick={context.relaunch}
      className="inline-flex w-fit items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-extrabold text-amber-800 shadow-sm hover:bg-amber-50"
    >
      Replay page guide
    </button>
  );
}
