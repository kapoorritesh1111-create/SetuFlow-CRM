'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SmcIcon, type SmcIconName, DOCS_WORKSPACE_HREF, E2E_WORKSPACE_HREF, DEMO_CHECKLIST_HREF } from './smc-shell';
import { SMC_RANGE_OPTIONS } from '@/features/workspace/filters';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: SmcIconName;
  external?: boolean;
  exact?: boolean;
};

type FilterOption = {
  label: string;
  value: string;
};

const SMC_NAV: NavItem[] = [
  { href: '/workspace', label: 'Dashboard', icon: 'mission', exact: true },
  { href: '/workspace/issues', label: 'Issues', icon: 'board' },
  { href: '/workspace/sprints', label: 'Sprints', icon: 'sprint' },
  { href: '/workspace/agents', label: 'Agents', icon: 'agent' },
  { href: '/workspace/clients', label: 'Client Impact', icon: 'client' },
  { href: DOCS_WORKSPACE_HREF, label: 'Docs', icon: 'docs', external: true },
  { href: E2E_WORKSPACE_HREF, label: 'QA', icon: 'qa', external: true },
  { href: DEMO_CHECKLIST_HREF, label: 'Demo', icon: 'demo', external: true },
];

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', "Won't Fix", 'Deferred'];

function nextParams(searchParams: URLSearchParams, patch: Record<string, string | null>) {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (!value) params.delete(key);
    else params.set(key, value);
  }
  if (patch.range && patch.range !== 'custom') {
    params.delete('start');
    params.delete('end');
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function compactValue(value: string | null, fallback: string) {
  return value && value.trim() ? value : fallback;
}

function SelectField({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <label className="group relative min-w-[150px] shrink-0 sm:min-w-[170px]">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-9 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-sky-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <option key={`${ariaLabel}-${option.value || 'all'}`} value={option.value}>{option.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">v</span>
    </label>
  );
}

export function SmcGlobalFilterStrip({
  sprints,
  areas,
  reporters,
}: {
  sprints: number[];
  areas: string[];
  reporters: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get('range') ?? '14d';
  const showCustomDates = range === 'custom';
  const searchValue = searchParams.get('q') ?? '';
  const [localSearch, setLocalSearch] = useState(searchValue);
  const sprintValue = searchParams.get('sprint') ?? '';
  const severityValue = searchParams.get('severity') ?? '';
  const statusValue = searchParams.get('status') ?? '';
  const areaValue = searchParams.get('area') ?? '';
  const reporterValue = searchParams.get('reporter') ?? '';

  function apply(patch: Record<string, string | null>) {
    router.push(`${pathname}${nextParams(searchParams, patch)}`, { scroll: false });
  }

  function hrefWithCurrentQuery(href: string) {
    if (href.startsWith('/internal')) return href;
    const query = searchParams.toString();
    return query ? `${href}?${query}` : href;
  }

  const sprintOptions = [{ label: 'All sprints', value: '' }, ...sprints.map((sprint) => ({ label: `Sprint ${sprint}`, value: String(sprint) }))];
  const severityOptions = [{ label: 'All severities', value: '' }, ...SEVERITIES.map((severity) => ({ label: severity, value: severity }))];
  const statusOptions = [{ label: 'All statuses', value: '' }, ...STATUSES.map((status) => ({ label: status, value: status }))];
  const areaOptions = [{ label: 'All areas', value: '' }, ...areas.map((area) => ({ label: area, value: area }))];
  const reporterOptions = [{ label: 'All reporters', value: '' }, ...reporters.map((reporter) => ({ label: reporter, value: reporter }))];
  const activeFilterCount = [sprintValue, severityValue, statusValue, areaValue, reporterValue].filter(Boolean).length;

  return (
    <div className="sticky top-0 z-30 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/95 shadow-[0_18px_70px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 backdrop-blur-xl">
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#07111f] via-[#0b1a2c] to-[#211b45] px-3 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto pb-1">
          <div className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 text-sky-100">
            <SmcIcon name="mission" className="h-4 w-4" />
            <span className="text-[12px] font-black uppercase tracking-[0.18em]">SMC</span>
          </div>
          {SMC_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={hrefWithCurrentQuery(item.href)}
                target={item.external ? '_blank' : undefined}
                title={item.label}
                className={cn(
                  'flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-[14px] font-bold tracking-tight transition',
                  active
                    ? 'border-white bg-white text-slate-950 shadow-sm'
                    : 'border-white/10 bg-white/[0.07] text-white/90 hover:border-sky-300/40 hover:bg-white/[0.14] hover:text-white',
                )}
              >
                <SmcIcon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-white px-3 py-3">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Timeline</span>
          <div className="flex shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {SMC_RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => apply({ range: option })}
                className={cn(
                  'h-9 shrink-0 rounded-xl px-3 text-xs font-semibold transition',
                  range === option
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900',
                )}
              >
                {option === 'all' ? 'All' : option === 'today' ? 'Today' : option === 'yesterday' ? 'Yest' : option.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => apply({ range: 'custom' })}
              className={cn(
                'h-9 shrink-0 rounded-xl px-3 text-xs font-semibold transition',
                showCustomDates
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900',
              )}
            >
              Custom
            </button>
          </div>
          <SelectField ariaLabel="Sprint filter" value={sprintValue} options={sprintOptions} onChange={(value) => apply({ sprint: value || null })} />
          <SelectField ariaLabel="Severity filter" value={severityValue} options={severityOptions} onChange={(value) => apply({ severity: value || null })} />
          <SelectField ariaLabel="Status filter" value={statusValue} options={statusOptions} onChange={(value) => apply({ status: value || null })} />
          <SelectField ariaLabel="Area filter" value={areaValue} options={areaOptions} onChange={(value) => apply({ area: value || null })} />
          <SelectField ariaLabel="Reporter filter" value={reporterValue} options={reporterOptions} onChange={(value) => apply({ reporter: value || null })} />
          {activeFilterCount ? (
            <button type="button" onClick={() => apply({ sprint: null, severity: null, status: null, area: null, reporter: null })} className="h-11 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 shadow-sm hover:border-sky-300 hover:text-sky-700">
              Clear {activeFilterCount}
            </button>
          ) : null}
          <label className="ml-auto flex h-11 min-w-[220px] shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-slate-400 shadow-sm focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100 sm:min-w-[280px]">
            <span className="text-[13px]">Search</span>
            <input
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') apply({ q: localSearch || null });
                if (event.key === 'Escape') { setLocalSearch(''); apply({ q: null }); }
              }}
              onBlur={() => apply({ q: localSearch || null })}
              placeholder="Search SMC..."
              aria-label="Search Setu Mission Control"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
            {localSearch ? (
              <button type="button" onClick={() => { setLocalSearch(''); apply({ q: null }); }} className="rounded-full px-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700">x</button>
            ) : null}
          </label>
        </div>
      </div>

      {showCustomDates ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            apply({
              range: 'custom',
              start: String(form.get('start') ?? '') || null,
              end: String(form.get('end') ?? '') || null,
            });
          }}
          className="flex flex-wrap items-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"
        >
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Start<input name="start" type="date" defaultValue={searchParams.get('start') ?? ''} className="mt-1 block rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none" /></label>
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">End<input name="end" type="date" defaultValue={searchParams.get('end') ?? ''} className="mt-1 block rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none" /></label>
          <button type="submit" className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600">Apply range</button>
          <span className="text-xs text-slate-500">{compactValue(searchParams.get('start'), 'Start')} to {compactValue(searchParams.get('end'), 'Today')}</span>
        </form>
      ) : null}
    </div>
  );
}
