'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
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

const SMC_NAV: NavItem[] = [
  { href: '/workspace', label: 'Dashboard', icon: 'mission', exact: true },
  { href: '/workspace/issues', label: 'Issues', icon: 'board' },
  { href: '/workspace/sprints', label: 'Sprints', icon: 'sprint' },
  { href: '/workspace/agents', label: 'Guru Queue', icon: 'agent' },
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

function CompactSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="group relative flex min-w-[132px] items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-[11px] font-black text-slate-200 shadow-sm ring-1 ring-white/[0.03] transition hover:border-sky-300/30 hover:bg-white/[0.085] md:min-w-[142px]">
      <span className="whitespace-nowrap text-slate-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="min-w-0 flex-1 appearance-none bg-transparent pr-4 text-[11px] font-black text-white outline-none [&>option]:bg-slate-950 [&>option]:text-white"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-[9px] text-slate-400">▼</span>
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

  function apply(patch: Record<string, string | null>) {
    router.push(`${pathname}${nextParams(searchParams, patch)}`, { scroll: false });
  }

  function hrefWithCurrentQuery(href: string) {
    if (href.startsWith('/internal')) return href;
    const query = searchParams.toString();
    return query ? `${href}?${query}` : href;
  }

  const currentNav = SMC_NAV.find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))?.label ?? 'Dashboard';

  return (
    <div className="sticky top-0 z-30 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 text-white shadow-[0_18px_70px_rgba(2,6,23,0.30)] ring-1 ring-white/[0.04] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(12,127,255,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_28%)]" />
      <div className="relative flex flex-col gap-2 p-2">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-sky-100 md:hidden">
            <SmcIcon name="mission" className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">SMC</span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-300">{currentNav}</span>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-sky-100 md:flex">
            <SmcIcon name="mission" className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">SMC</span>
          </div>
          {SMC_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={hrefWithCurrentQuery(item.href)}
                target={item.external ? '_blank' : undefined}
                className={cn(
                  'hidden shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition md:flex',
                  active
                    ? 'border-white bg-white text-slate-950 shadow-sm'
                    : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-sky-300/35 hover:bg-white/[0.085] hover:text-white',
                )}
              >
                <SmcIcon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(180px,260px)] lg:items-center">
          <div className="flex min-w-0 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.045] p-1">
            {SMC_RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => apply({ range: option })}
                className={cn(
                  'shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition',
                  range === option
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-white/[0.08] hover:text-white',
                )}
              >
                {option === 'all' ? 'All' : option === 'today' ? 'Today' : option.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => apply({ range: 'custom' })}
              className={cn(
                'shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition',
                showCustomDates
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              Custom
            </button>
          </div>

          <div className="flex min-w-0 gap-2 overflow-x-auto lg:justify-center">
            <CompactSelect label="Sprint" value={searchParams.get('sprint') ?? ''} onChange={(value) => apply({ sprint: value || null })}>
              <option value="">All</option>
              {sprints.map((sprint) => <option key={sprint} value={sprint}>S{sprint}</option>)}
            </CompactSelect>
            <CompactSelect label="Severity" value={searchParams.get('severity') ?? ''} onChange={(value) => apply({ severity: value || null })}>
              <option value="">All</option>
              {SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}
            </CompactSelect>
            <CompactSelect label="Status" value={searchParams.get('status') ?? ''} onChange={(value) => apply({ status: value || null })}>
              <option value="">All</option>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </CompactSelect>
            <CompactSelect label="Area" value={searchParams.get('area') ?? ''} onChange={(value) => apply({ area: value || null })}>
              <option value="">All</option>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </CompactSelect>
            <CompactSelect label="Reporter" value={searchParams.get('reporter') ?? ''} onChange={(value) => apply({ reporter: value || null })}>
              <option value="">All</option>
              {reporters.map((reporter) => <option key={reporter}>{reporter}</option>)}
            </CompactSelect>
          </div>

          <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-slate-300 ring-1 ring-white/[0.03] transition focus-within:border-sky-300/45 focus-within:bg-white/[0.08]">
            <span className="text-[12px] text-slate-500">⌕</span>
            <input
              value={searchValue}
              onChange={(e) => apply({ q: e.target.value || null })}
              placeholder="Search SMC..."
              aria-label="Search Setu Mission Control"
              className="min-w-0 flex-1 bg-transparent text-xs font-bold text-white outline-none placeholder:text-slate-500"
            />
            {searchValue ? (
              <button type="button" onClick={() => apply({ q: null })} className="rounded-full px-1.5 text-[11px] font-black text-slate-400 hover:bg-white/10 hover:text-white">×</button>
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
