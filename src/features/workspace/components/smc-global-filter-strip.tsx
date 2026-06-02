'use client';

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

function selectedLabel(options: FilterOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? 'All';
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="truncate text-xs font-black text-sky-200">{selectedLabel(options, value)}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={`${label}-${option.value || 'all'}`}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'min-h-10 shrink-0 rounded-2xl border px-3.5 text-sm font-black transition',
                active
                  ? 'border-sky-300 bg-sky-400 text-slate-950 shadow-sm'
                  : 'border-white/10 bg-white/[0.055] text-slate-200 hover:border-sky-300/30 hover:bg-white/[0.10] hover:text-white',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
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

  const currentNav = SMC_NAV.find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))?.label ?? 'Dashboard';
  const sprintOptions = [{ label: 'All', value: '' }, ...sprints.slice(0, 12).map((sprint) => ({ label: `S${sprint}`, value: String(sprint) }))];
  const severityOptions = [{ label: 'All', value: '' }, ...SEVERITIES.map((severity) => ({ label: severity, value: severity }))];
  const statusOptions = [{ label: 'All', value: '' }, ...STATUSES.map((status) => ({ label: status, value: status }))];
  const areaOptions = [{ label: 'All', value: '' }, ...areas.slice(0, 14).map((area) => ({ label: area, value: area }))];
  const reporterOptions = [{ label: 'All', value: '' }, ...reporters.slice(0, 10).map((reporter) => ({ label: reporter, value: reporter }))];
  const activeFilterCount = [sprintValue, severityValue, statusValue, areaValue, reporterValue].filter(Boolean).length;

  return (
    <div className="sticky top-0 z-30 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 text-white shadow-[0_18px_70px_rgba(2,6,23,0.30)] ring-1 ring-white/[0.04] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(circle_at_top_left,rgba(12,127,255,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_28%)]" />
      <div className="relative flex flex-col gap-3 p-3">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto pb-1">
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sky-100">
            <SmcIcon name="mission" className="h-4 w-4" />
            <span className="text-[12px] font-black uppercase tracking-[0.18em]">SMC</span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-300 md:hidden">{currentNav}</span>
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
                  'flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-[14px] font-black tracking-tight transition',
                  active
                    ? 'border-white bg-white text-slate-950 shadow-sm'
                    : 'border-white/10 bg-white/[0.055] text-slate-100 hover:border-sky-300/35 hover:bg-white/[0.10] hover:text-white',
                )}
              >
                <SmcIcon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_minmax(240px,320px)] xl:items-center">
          <div className="flex min-w-0 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.045] p-1.5">
            {SMC_RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => apply({ range: option })}
                className={cn(
                  'min-h-10 shrink-0 rounded-xl px-3.5 text-[13px] font-black transition',
                  range === option
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-white/[0.08] hover:text-white',
                )}
              >
                {option === 'all' ? 'All' : option === 'today' ? 'Today' : option.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => apply({ range: 'custom' })}
              className={cn(
                'min-h-10 shrink-0 rounded-xl px-3.5 text-[13px] font-black transition',
                showCustomDates
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              Custom
            </button>
          </div>

          <details className="rounded-2xl border border-white/10 bg-slate-950/30 p-1.5 open:bg-slate-950/45">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 text-sm font-black text-white [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <span className="rounded-full bg-sky-400 px-2.5 py-1 text-[11px] font-black text-slate-950">Filters</span>
                <span className="truncate text-slate-300">
                  {activeFilterCount ? `${activeFilterCount} active` : 'All sprints, severities, statuses, areas, reporters'}
                </span>
              </span>
              <span className="text-sky-300">▾</span>
            </summary>
            <div className="mt-2 grid gap-4 border-t border-white/10 px-3 py-4 lg:grid-cols-2 2xl:grid-cols-5">
              <FilterGroup label="Sprint" value={sprintValue} options={sprintOptions} onChange={(value) => apply({ sprint: value || null })} />
              <FilterGroup label="Severity" value={severityValue} options={severityOptions} onChange={(value) => apply({ severity: value || null })} />
              <FilterGroup label="Status" value={statusValue} options={statusOptions} onChange={(value) => apply({ status: value || null })} />
              <FilterGroup label="Area" value={areaValue} options={areaOptions} onChange={(value) => apply({ area: value || null })} />
              <FilterGroup label="Reporter" value={reporterValue} options={reporterOptions} onChange={(value) => apply({ reporter: value || null })} />
            </div>
          </details>

          <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2 text-slate-300 ring-1 ring-white/[0.03] transition focus-within:border-sky-300/45 focus-within:bg-white/[0.08]">
            <span className="text-[13px] text-slate-500">⌕</span>
            <input
              value={searchValue}
              onChange={(e) => apply({ q: e.target.value || null })}
              placeholder="Search SMC..."
              aria-label="Search Setu Mission Control"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
            />
            {searchValue ? (
              <button type="button" onClick={() => apply({ q: null })} className="rounded-full px-1.5 text-[12px] font-black text-slate-400 hover:bg-white/10 hover:text-white">×</button>
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
          className="relative flex flex-wrap items-end gap-2 border-t border-white/10 bg-white/[0.035] px-3 py-2"
        >
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Start<input name="start" type="date" defaultValue={searchParams.get('start') ?? ''} className="mt-1 block rounded-xl border border-white/10 bg-slate-950/70 px-2 py-1.5 text-xs text-white outline-none" /></label>
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">End<input name="end" type="date" defaultValue={searchParams.get('end') ?? ''} className="mt-1 block rounded-xl border border-white/10 bg-slate-950/70 px-2 py-1.5 text-xs text-white outline-none" /></label>
          <button type="submit" className="rounded-xl bg-sky-400 px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-sky-300">Apply range</button>
          <span className="text-xs text-slate-500">{compactValue(searchParams.get('start'), 'Start')} → {compactValue(searchParams.get('end'), 'Today')}</span>
        </form>
      ) : null}
    </div>
  );
}
