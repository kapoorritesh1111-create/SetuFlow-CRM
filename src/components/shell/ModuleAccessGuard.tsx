'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { getEnabledModuleSet, getModuleForPath, isPathEnabled, type ModuleKey, type OrgModuleGrant } from '@/lib/modules/module-grants';

type GrantsResponse = { grants?: OrgModuleGrant[]; enabledModules?: ModuleKey[] };

type TrialPreviewCopy = {
  eyebrow: string;
  title: string;
  description: string;
  active?: boolean;
};

function isTradeShowTrialOrg(enabledModules: ReadonlySet<ModuleKey>) {
  return enabledModules.has('trade_show') && !enabledModules.has('full_crm');
}

function getTradeShowTrialPreviewCopy(pathname: string): TrialPreviewCopy | null {
  if (pathname.startsWith('/trade-events')) {
    return {
      eyebrow: 'Trade Show Trial',
      title: 'Trial Home is live',
      description: 'Use this workspace to capture booth leads, share vCard context, and review trade show activity.',
      active: true,
    };
  }
  if (pathname.startsWith('/contact-exchange')) {
    return {
      eyebrow: 'Trade Show Trial',
      title: 'Capture and vCard tools are live',
      description: 'Quick Lead booth capture and vCard sharing are active during the trial.',
      active: true,
    };
  }
  if (pathname.startsWith('/leads')) {
    return {
      eyebrow: 'Trade Show Trial',
      title: 'Leads list is live for captured booth leads',
      description: 'Review captured leads and create follow-up tasks. Quote and order actions remain upgrade-only.',
      active: true,
    };
  }
  if (pathname.startsWith('/tasks')) {
    return {
      eyebrow: 'Trade Show Trial',
      title: 'Follow-up tasks are live for captured leads',
      description: 'Create and update follow-up work tied to trade show leads. Broader workflow automation unlocks after upgrade.',
      active: true,
    };
  }
  if (pathname.startsWith('/dashboard')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Dashboard preview',
      description: 'This view shows how captured trade show activity becomes command-center metrics, analytics, and leadership reporting after upgrade.',
    };
  }
  if (pathname.startsWith('/pipeline')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Pipeline preview',
      description: 'Preview how captured leads move through stages, risk signals, and rescue lanes after the trial converts.',
    };
  }
  if (pathname.startsWith('/approval-send')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Send preview',
      description: 'Preview the outbound approval and sending workspace. Live send actions are disabled during the trial except approved introduction/follow-up behavior.',
    };
  }
  if (pathname.startsWith('/documents') || pathname.startsWith('/compliance')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Documents preview',
      description: 'Preview how documents and compliance readiness connect to quotes and orders after upgrade. Upload/edit actions stay locked in the trial.',
    };
  }
  if (pathname.startsWith('/products')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Catalog preview',
      description: 'Preview the product and pricing backbone. Trial users can capture product interest, but catalog management unlocks after upgrade.',
    };
  }
  if (pathname.startsWith('/quotes')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Quotes preview',
      description: 'See how captured booth leads become structured quotes after upgrade. Quote creation and quote sending remain locked during the trial.',
    };
  }
  if (pathname.startsWith('/orders')) {
    return {
      eyebrow: 'Available after upgrade',
      title: 'Orders preview',
      description: 'See how accepted quotes become execution-ready orders after upgrade. Order creation and fulfillment actions remain locked during the trial.',
    };
  }
  return null;
}

function InlineTrialPreviewBanner({ copy }: { copy: TrialPreviewCopy }) {
  const classes = copy.active
    ? 'sf-trial-preview-banner sf-trial-preview-banner-active rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm'
    : 'sf-trial-preview-banner sf-trial-preview-banner-upgrade rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm';

  return (
    <div className={classes} data-trial-preview-state={copy.active ? 'active' : 'upgrade'}>
      <p className="sf-trial-preview-eyebrow text-[11px] font-black uppercase tracking-[0.18em]">{copy.eyebrow}</p>
      <p className="sf-trial-preview-title mt-1 font-black">{copy.title}</p>
      <p className="sf-trial-preview-description mt-1 max-w-5xl font-medium leading-6 opacity-90">{copy.description}</p>
    </div>
  );
}

function FullPreviewFallback({ preview }: { preview: TrialPreviewCopy }) {
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
                Open trial home
              </Link>
              <Link href="/leads?quickLead=1&sourceType=trade_event" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-5 text-sm font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100">
                Add booth lead
              </Link>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Trial includes</p>
            <div className="mt-4 space-y-3 text-sm font-bold text-slate-700">
              <div className="rounded-2xl bg-white p-3">Quick Lead booth capture</div>
              <div className="rounded-2xl bg-white p-3">Leads list and follow-up tasks</div>
              <div className="rounded-2xl bg-white p-3">View-only module previews</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
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
  const isTrial = grants ? isTradeShowTrialOrg(enabledModules) : false;
  const previewCopy = isTrial ? getTradeShowTrialPreviewCopy(pathname) : null;

  if (grants && moduleDef && !isPathEnabled(pathname, enabledModules) && !previewCopy) {
    return <FullPreviewFallback preview={{ eyebrow: 'Available after upgrade', title: 'This module is available after upgrade', description: 'Continue the trade show trial from the existing workspace, then upgrade when you are ready for the full CRM workflow.' }} />;
  }

  if (previewCopy) {
    return (
      <div className="sf-trial-preview-wrap space-y-4">
        <InlineTrialPreviewBanner copy={previewCopy} />
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
