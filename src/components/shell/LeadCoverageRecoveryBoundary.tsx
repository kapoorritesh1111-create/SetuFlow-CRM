'use client';

import { useEffect, useState } from 'react';

type RecoveryState = { visible: boolean; reason: string };

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

function focusPanel(element: HTMLElement) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: true });
  element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
  window.setTimeout(() => element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2'), 1800);
}

function focusCoveragePanel() {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('section, article, div')).filter(visible);
  const exact = blocks.find((block) => /coverage\s+[-—]\s+product and market mapping/i.test(textOf(block)));
  if (exact) {
    focusPanel(exact);
    return true;
  }
  const fallback = blocks.find((block) => /products and markets define the commercial scope/i.test(textOf(block)));
  if (fallback) {
    focusPanel(fallback);
    return true;
  }
  return false;
}

function openCoveragePanel() {
  if (focusCoveragePanel()) return true;
  const controls = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a')).filter(visible);
  const control = controls.find((button) => {
    const label = textOf(button);
    if (/close panel|dismiss|back to queue/i.test(label)) return false;
    const parent = textOf(button.closest('section, article, div'));
    return /inspect|open coverage|edit coverage|edit product coverage/i.test(label) && /coverage|product.*market|market.*product/i.test(parent);
  });
  if (!control) return false;
  control.click();
  window.setTimeout(() => focusCoveragePanel(), 300);
  return true;
}

function setCoverageUrlHint() {
  const params = new URLSearchParams(window.location.search);
  const leadId = params.get('leadId') || params.get('openLeadId') || params.get('id') || '';
  if (leadId) params.set('openLeadId', leadId);
  params.set('initialStepId', 'coverage');
  params.set('focus', 'coverage');
  window.history.replaceState(window.history.state, '', `/leads?${params.toString()}`);
}

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
      const bodyText = document.body?.innerText || '';
      if (/link at least one product|no products mapped|product coverage required|add product coverage/i.test(bodyText)) {
        setState({ visible: true, reason: 'Product coverage is required before quote creation. Open Coverage, select product and market coverage, save, then create the quote again.' });
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') : null;
      const label = textOf(target);
      if (/create quote|quote preview|open quote|start quote/i.test(label)) {
        window.setTimeout(inspect, 350);
        window.setTimeout(inspect, 1200);
      }
      if (/quick edit|edit lead|open lead/i.test(label)) {
        window.setTimeout(() => {
          if (/coverage/.test(window.location.search.toLowerCase())) openCoveragePanel();
        }, 500);
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

  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('step') === 'coverage' || params.get('initialStepId') === 'coverage' || params.get('focus') === 'coverage') {
      window.setTimeout(() => openCoveragePanel(), 300);
      window.setTimeout(() => openCoveragePanel(), 900);
    }
  }, [enabled]);

  if (!enabled || !state.visible) return null;

  const openCoverage = () => {
    setState({ visible: false, reason: '' });
    window.setTimeout(() => {
      if (openCoveragePanel()) return;
      setCoverageUrlHint();
      window.setTimeout(() => openCoveragePanel(), 350);
    }, 0);
  };

  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[10000] w-[min(420px,calc(100vw-2rem))] rounded-3xl border border-amber-200 bg-white p-4 text-sm text-slate-800 shadow-2xl">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">Coverage required</div>
      <p className="mb-3 leading-6">{state.reason || 'Open Coverage, map at least one product and market, save, then create the quote again.'}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={openCoverage} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white">Open coverage manager</button>
        <button type="button" onClick={() => setState({ visible: false, reason: '' })} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Dismiss</button>
      </div>
    </div>
  );
}
