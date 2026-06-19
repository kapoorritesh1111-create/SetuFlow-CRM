'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { getEnabledModuleSet, getModuleForPath, isPathEnabled, type ModuleKey, type OrgModuleGrant } from '@/lib/modules/module-grants';

type GrantsResponse = { grants?: OrgModuleGrant[]; enabledModules?: ModuleKey[] };

function getPreviewCopy(pathname: string) {
  if (pathname.startsWith('/dashboard')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Dashboard preview',
      description: 'Your trade show trial is focused on booth capture, vCard sharing, and export. Full dashboard analytics unlock after upgrade.',
    };
  }
  if (pathname.startsWith('/leads') || pathname.startsWith('/pipeline')) {
    return {
      eyebrow: 'Use trial capture first',
      title: 'Lead Command Center unlocks after upgrade',
      description: 'During the trial, capture booth conversations as reviewable entries. Upgrade when you are ready to convert them into the full CRM pipeline.',
    };
  }
  if (pathname.startsWith('/quotes')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Quotes unlock after trial capture',
      description: 'Validate trade show interest first. Quote building opens when this workspace is upgraded to the full CRM plan.',
    };
  }
  if (pathname.startsWith('/orders')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Orders and compliance are preview-only',
      description: 'The trial keeps booth activity simple. Order execution and compliance controls unlock after upgrade.',
    };
  }
  return {
    eyebrow: 'Preview-only module',
    title: 'This module is available after upgrade',
    description: 'Continue the trade show trial from the capture workspace, then upgrade when you are ready for the full CRM workflow.',
  };
}

export function ModuleAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [grants, setGrants] = useState<OrgModuleGrant[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/modules/grants', { cache: 'no-store' })
      .then((response) => response.json() as Promise<GrantsResponse>)
      .then((payload) => {
        if (!active) return;
        if (payload.grants?.length) setGrants(payload.grants);
        else if (payload.enabledModules?.length) setGrants(payload.enabledModules.map((moduleKey) => ({ module_key: moduleKey, enabled: true })));
        else setGrants([]);
      })
      .catch(() => {
        if (active) setGrants([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const enabledModules = useMemo(() => getEnabledModuleSet(grants), [grants]);
  const moduleDef = getModuleForPath(pathname);

  if (grants && moduleDef && !isPathEnabled(pathname, enabledModules)) {
    const preview = getPreviewCopy(pathname);
    return (
      <div className="mx-auto flex min-h-[68vh] max-w-5xl items-center px-4 py-10">
        <section className="relative w-full overflow-hidden rounded-[2rem] border border-blue-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                {preview.eyebrow}
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">{preview.title}</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{preview.description}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/trade-events?mode=trade_show_trial" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800">
                  Open trial workspace
                </Link>
                <Link href="/trade-events/capture?mode=trade_show_trial&source=type&leadType=buyer" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-5 text-sm font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100">
                  Capture booth entry
                </Link>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Trial includes</p>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-700">
                <div className="rounded-2xl bg-white p-3">Type, dictate, or scan booth entries</div>
                <div className="rounded-2xl bg-white p-3">Share vCard and QR context</div>
                <div className="rounded-2xl bg-white p-3">Export captured entries to CSV</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
