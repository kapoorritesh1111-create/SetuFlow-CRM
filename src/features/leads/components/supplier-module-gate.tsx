'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { getEnabledModuleSet, type OrgModuleGrant } from '@/lib/modules/module-grants';

type Props = {
  children: ReactNode;
  companyName: string;
  leadId: string;
};

function LockedScreen({ companyName, leadId }: { companyName: string; leadId: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="rounded-[2rem] border border-teal-200 bg-white p-8 shadow-sm">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
          <svg className="h-7 w-7 text-[#279491]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>

        {/* Label */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#279491]">
          Supplier Procurement Module
        </p>

        {/* Heading */}
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Full sourcing workspace locked
        </h2>

        {/* Body */}
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          <span className="font-semibold text-slate-700">{companyName}</span> is a supplier record.
          The full procurement workflow — compliance readiness, cost requests, RFQ responses,
          approval lifecycle, demand linkage, and performance KPIs — requires the
          Supplier Procurement add-on.
        </p>

        {/* What's included list */}
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Unlocks with this module
          </p>
          <ul className="mt-3 space-y-2">
            {[
              '9-tab Supplier Sourcing Workspace',
              'Compliance document readiness + blockers',
              'Cost Request creation flow',
              'RFQ response tracking + offer comparison',
              'Approve / Reject / Inactive supplier lifecycle',
              'Linked Buyer Demand matching',
              'Supplier performance KPIs',
              'Supplier sourcing reports + analytics dashboard',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <svg className="h-3.5 w-3.5 shrink-0 text-[#279491]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What still works */}
        <p className="mt-5 text-xs text-slate-400">
          Supplier capture, pipeline stage tracking, and basic profile remain available on your current plan.
        </p>

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="mailto:admin@setugroups.com?subject=Supplier Procurement Module&body=I'd like to enable the Supplier Procurement module for my organisation."
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F487C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#163561]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Request module access
          </a>
          <Link
            href={`/leads/${leadId}?mode=suppliers`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Back to supplier list
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SupplierModuleGate({ children, companyName, leadId }: Props) {
  const [grants, setGrants] = useState<OrgModuleGrant[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/modules/grants', { cache: 'no-store' })
      .then((res) => res.json())
      .then((payload: { grants?: OrgModuleGrant[]; enabledModules?: string[] }) => {
        if (!active) return;
        if (payload.grants?.length) {
          setGrants(payload.grants);
        } else if (payload.enabledModules?.length) {
          setGrants(payload.enabledModules.map((k) => ({ module_key: k as OrgModuleGrant['module_key'], enabled: true })));
        } else {
          // No grants at all → all modules default ON (existing orgs keep full access)
          setGrants([]);
        }
      })
      .catch(() => { if (active) setGrants([]); });
    return () => { active = false; };
  }, []);

  const enabledModules = useMemo(() => getEnabledModuleSet(grants), [grants]);

  // Still loading — render nothing to avoid flash
  if (grants === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#279491] border-t-transparent" />
      </div>
    );
  }

  // No grants row in DB (grants === []) means the org has no explicit module config.
  // Per existing behavior this means ALL modules are enabled — full access granted.
  if (grants.length === 0 || enabledModules.has('supplier_procurement')) {
    return <>{children}</>;
  }

  // org has explicit grants but supplier_procurement is not among them → locked
  return <LockedScreen companyName={companyName} leadId={leadId} />;
}
