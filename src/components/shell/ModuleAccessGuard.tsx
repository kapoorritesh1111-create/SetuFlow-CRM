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
    ? 'sf-trial-preview-banner sf-trial-preview-banner-active rounded-panel border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm'
    : 'sf-trial-preview-banner sf-trial-preview-banner-upgrade rounded-panel border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm';

  return (
    <div className={classes} data-trial-preview-state={copy.active ? 'active' : 'upgrade'}>
      <p className="sf-trial-preview-eyebrow text-[11px] font-black uppercase tracking-[0.18em]">{copy.eyebrow}</p>
      <p className="sf-trial-preview-title mt-1 font-black">{copy.title}</p>
      <p className="sf-trial-preview-description mt-1 max-w-5xl font-medium leading-6 opacity-90">{copy.description}</p>
    </div>
  );
}

function getSupplierProcurementUpgradeCopy(pathname: string): TrialPreviewCopy | null {
  if (pathname.startsWith('/dashboard/supplier-insights')) {
    return {
      eyebrow: 'Supplier Procurement Module',
      title: 'Supplier Insights is an add-on',
      description: 'The sourcing command center, supplier funnel analytics, and Guru recommendations require the Supplier Procurement module. Contact your account manager to enable it.',
    };
  }
  if (pathname.startsWith('/reports/suppliers')) {
    return {
      eyebrow: 'Supplier Procurement Module',
      title: 'Supplier Reports is an add-on',
      description: 'Clean vendor-facing sourcing reports with document readiness, cost request movement, and approval status require the Supplier Procurement module.',
    };
  }
  if (pathname.startsWith('/orders/supplier-links')) {
    return {
      eyebrow: 'Supplier Procurement Module',
      title: 'Supplier Orders is an add-on',
      description: 'PO execution, inbound tracking, quality checks, and supplier performance linked to buyer orders require the Supplier Procurement module.',
    };
  }
  return null;
}

function SupplierUpgradeFallback({ preview }: { preview: TrialPreviewCopy }) {
  return (
    <div className="mx-auto flex min-h-[68vh] max-w-2xl items-center px-4 py-10">
      <section className="w-full overflow-hidden rounded-hero border border-teal-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
          <svg className="h-6 w-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-teal-700">
          {preview.eyebrow}
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{preview.title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{preview.description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="mailto:admin@setugroups.com?subject=Supplier Procurement Module"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Request module access
          </a>
          <Link href="/leads?mode=suppliers" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
            Back to supplier leads
          </Link>
        </div>
      </section>
    </div>
  );
}

function FullPreviewFallback({ preview }: { preview: TrialPreviewCopy }) {
  return (
    <div className="mx-auto flex min-h-[68vh] max-w-5xl items-center px-4 py-10">
      <section className="relative w-full overflow-hidden rounded-hero border border-blue-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] sm:p-8">
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
          <div className="rounded-panel border border-slate-200 bg-slate-50 p-4">
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

  const supplierUpgradeCopy = grants ? getSupplierProcurementUpgradeCopy(pathname) : null;
  const isSupplierRoute = supplierUpgradeCopy !== null;

  // Supplier procurement routes: show sourcing-specific upgrade screen if module is disabled
  if (grants && isSupplierRoute && !enabledModules.has('supplier_procurement') && grants.length > 0) {
    return <SupplierUpgradeFallback preview={supplierUpgradeCopy!} />;
  }

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
