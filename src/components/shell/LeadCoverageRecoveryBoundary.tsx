'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type RecoveryState = {
  visible: boolean;
  reason: string;
};

function isLeadsPath(pathname: string | null) {
  return String(pathname ?? '').startsWith('/leads');
}

function findClickableByText(pattern: RegExp) {
  const candidates = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a'));
  return candidates.find((element) => pattern.test((element.textContent ?? '').replace(/\s+/g, ' ').trim())) ?? null;
}

function clickCoverageTarget() {
  const coverage = findClickableByText(/coverage|product.*market|market.*product|edit product coverage|open coverage manager/i);
  if (coverage) {
    coverage.click();
    return true;
  }
  return false;
}

export function LeadCoverageRecoveryBoundary() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<RecoveryState>({ visible: false, reason: '' });
  const enabled = isLeadsPath(pathname);
  const leadId = useMemo(() => searchParams.get('leadId') ?? searchParams.get('openLeadId') ?? searchParams.get('id') ?? '', [searchParams]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const showRecovery = (reason: string) => setState({ visible: true, reason });
    const inspect = () => {
      const bodyText = document.body?.innerText ?? '';
      if (/link at least one product|no products mapped|product coverage required|add product coverage/i.test(bodyText)) {
        showRecovery('Product coverage is required before quote creation. Open Coverage, select product and market coverage, save, then create the quote again.');
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') : null;
      const label = target?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (/create quote|quote preview|open quote|start quote/i.test(label)) {
        window.setTimeout(inspect, 350);
        window.setTimeout(inspect, 1200);
      }
      if (/quick edit|edit lead|open lead/i.test(label)) {
        window.setTimeout(() => {
          if (/coverage/.test(window.location.search.toLowerCase())) clickCoverageTarget();
        }, 500);
      }
    };

    inspect();
    document.addEventListener('click', onClick, true);
    const observer = new MutationObserver(() => inspect());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener('click', onClick, true);
      observer.disconnect();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (searchParams.get('step') === 'coverage' || searchParams.get('initialStepId') === 'coverage' || searchParams.get('focus') === 'coverage') {
      window.setTimeout(() => clickCoverageTarget(), 300);
      window.setTimeout(() => clickCoverageTarget(), 900);
    }
  }, [enabled, searchParams]);

  if (!enabled || !state.visible) return null;

  const openCoverage = () => {
    setState({ visible: false, reason: '' });
    if (clickCoverageTarget()) return;
    const params = new URLSearchParams(searchParams.toString());
    if (leadId) params.set('openLeadId', leadId);
    params.set('initialStepId', 'coverage');
    params.set('focus', 'coverage');
    router.replace(`/leads?${params.toString()}`, { scroll: false });
    window.setTimeout(() => clickCoverageTarget(), 500);
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
