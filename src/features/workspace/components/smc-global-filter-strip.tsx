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

const SMC_NAV: NavItem[] = [
  { href: '/workspace', label: 'Dashboard', icon: 'mission', exact: true },
  { href: '/workspace/issues', label: 'Issues', icon: 'board' },
  { href: '/workspace/sprints', label: 'Sprints', icon: 'sprint' },
  { href: '/workspace/agents', label: 'AI Queue', icon: 'agent' },
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

export function SmcGlobalFilterStrip({
  sprints,
  areas,
}: {
  sprints: number[];
  areas: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get('range') ?? '14d';
  const showCustomDates = range === 'custom';

  function apply(patch: Record<string, string | null>) {
    router.push(`${pathname}${nextParams(searchParams, patch)}`, { scroll: false });
  }

  function hrefWithCurrentQuery(href: string) {
    if (href.startsWith('/internal')) return href;
    const query = searchParams.toString();
    return query ? `${href}?${query}` : href;
  }

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] dark:border-white/10 dark:bg-slate-950/75">
      <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#0c7fff]/20 bg-[#0c7fff]/10 px-3 py-2 text-[#0c7fff] dark:border-violet-300/20 dark:bg-violet-500/15 dark:text-violet-200">
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
                  'flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition',
                  active
                    ? 'border-slate-950 bg-slate-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950'
                    : 'border-slate-200/80 bg-white text-slate-600 hover:border-[#0c7fff]/30 hover:text-[#0c7fff] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-violet-300/40 dark:hover:text-white',
                )}
              >
                <SmcIcon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
            {SMC_RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => apply({ range: option })}
                className={cn(
                  'rounded-xl px-2.5 py-1.5 text-[11px] font-black transition',
                  range === option
                    ? 'bg-[#0c7fff] text-white shadow-sm dark:bg-violet-500'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white',
                )}
              >
                {option === 'all' ? 'All' : option === 'today' ? 'Today' : option.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => apply({ range: 'custom' })}
              className={cn(
                'rounded-xl px-2.5 py-1.5 text-[11px] font-black transition',
                showCustomDates
                  ? 'bg-[#0c7fff] text-white shadow-sm dark:bg-violet-500'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white',
              )}
            >
              Custom
            </button>
          </div>

          <select value={searchParams.get('sprint') ?? ''} onChange={(e) => apply({ sprint: e.target.value || null })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
            <option value="">All sprints</option>
            {sprints.map((sprint) => <option key={sprint} value={sprint}>S{sprint}</option>)}
          </select>
          <select value={searchParams.get('severity') ?? ''} onChange={(e) => apply({ severity: e.target.value || null })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
            <option value="">All severity</option>
            {SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}
          </select>
          <select value={searchParams.get('status') ?? ''} onChange={(e) => apply({ status: e.target.value || null })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
            <option value="">All status</option>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select value={searchParams.get('area') ?? ''} onChange={(e) => apply({ area: e.target.value || null })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
            <option value="">All areas</option>
            {areas.map((area) => <option key={area}>{area}</option>)}
          </select>
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
          className="flex flex-wrap items-end gap-2 border-t border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.025]"
        >
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Start<input name="start" type="date" defaultValue={searchParams.get('start') ?? ''} className="mt-1 block rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200" /></label>
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">End<input name="end" type="date" defaultValue={searchParams.get('end') ?? ''} className="mt-1 block rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200" /></label>
          <button type="submit" className="rounded-xl bg-[#0c7fff] px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-[#0867cf] dark:bg-violet-500 dark:hover:bg-violet-400">Apply range</button>
        </form>
      ) : null}
    </div>
  );
}
