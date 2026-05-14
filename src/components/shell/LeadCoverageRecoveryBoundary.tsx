'use client';

import { useEffect, useState } from 'react';
import { InlineCoverageResolverRuntime, openInlineCoverageResolver } from '@/components/shell/InlineCoverageResolverRuntime';

type RecoveryState = { visible: boolean; reason: string };

declare global { interface Window { __setuCoverageResolverOpen?: boolean } }

function onLeadsPage() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/leads');
}

function textOf(element: Element | null) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function focusCoverageSummary() {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('section, article, div')).filter(visible);
  const panel = blocks.find((block) => /coverage\s+[-—]\s+product and market mapping/i.test(textOf(block)))
    ?? blocks.find((block) => /products and markets define the commercial scope/i.test(textOf(block)))
    ?? null;
  panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function openResolver() {
  window.__setuCoverageResolverOpen = true;
  focusCoverageSummary();
  openInlineCoverageResolver();
}

/**
 * Deprecated behavior note:
 * Previous versions used this recovery card to click Quick Edit and then move into Coverage.
 * That created a poor SaaS UX because coverage recovery is a focused unblock task, not a full lead-edit task.
 * Keep this component only as the blocker detector/last-resort entry point; all recovery now happens in the inline center-panel resolver.
 */
export function LeadCoverageRecoveryBoundary() {
  const [state, setState] = useState<RecoveryState>({ visible: false, reason: '' });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(onLeadsPage());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const inspect = () => {
      if (window.__setuCoverageResolverOpen || document.querySelector('[data-inline-coverage-resolver]')) {
        setState({ visible: false, reason: '' });
        return;
      }
      const bodyText = document.body?.innerText || '';
      if (/link at least one product|no products mapped|product coverage required|add product coverage/i.test(bodyText)) {
        setState({ visible: true, reason: 'Product coverage is required before quote creation. Add product and market coverage inline, then create the quote again.' });
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') : null;
      const label = textOf(target);
      if (/create quote|quote preview|open quote|start quote/i.test(label)) {
        window.setTimeout(inspect, 350);
        window.setTimeout(inspect, 1200);
      }
    };
    inspect();
    document.addEventListener('click', onClick, true);
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener('click', onClick, true);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <InlineCoverageResolverRuntime />
      {state.visible ? (
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[10000] w-[min(420px,calc(100vw-2rem))] rounded-3xl border border-amber-200 bg-white p-4 text-sm text-slate-800 shadow-2xl">
          <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">Coverage required</div>
          <p className="mb-3 leading-6">{state.reason || 'Add product and market coverage inline, then create the quote again.'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setState({ visible: false, reason: '' }); window.setTimeout(openResolver, 0); }} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white">Add product coverage</button>
            <button type="button" onClick={() => setState({ visible: false, reason: '' })} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Dismiss</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
