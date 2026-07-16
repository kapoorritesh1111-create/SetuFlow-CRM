'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Filter, Search, Users } from 'lucide-react';
import { workspacePanelClass } from '@/components/ui/workspace-surfaces';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export function CrmMatchesWorkspace({ opportunities, icpConfigured }: { opportunities: OpportunityCard[]; icpConfigured: boolean }) {
  const [type, setType] = useState<'all' | 'buyer' | 'supplier'>('all');
  const [country, setCountry] = useState('all');
  const [contact, setContact] = useState<'all' | 'contacted' | 'not_contacted'>('all');
  const [minFit, setMinFit] = useState(40);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const countries = useMemo(() => Array.from(new Set(opportunities.map((item) => item.country).filter(Boolean) as string[])).sort(), [opportunities]);
  const filtered = useMemo(() => opportunities.filter((item) => {
    if (type !== 'all' && item.leadType !== type) return false;
    if (country !== 'all' && item.country !== country) return false;
    if (contact !== 'all' && item.contactState !== contact) return false;
    if (item.fitScore.score < minFit) return false;
    if (query && !`${item.label} ${item.country ?? ''} ${item.companyType ?? ''} ${item.signalSource}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [opportunities, type, country, contact, minFit, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const average = filtered.length ? Math.round(filtered.reduce((sum, item) => sum + item.fitScore.score, 0) / filtered.length) : 0;

  return (
    <section className="space-y-4" aria-label="CRM Matches workspace">
      <div className={cn(workspacePanelClass, 'p-4')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-medium uppercase tracking-wide text-brand-700">CRM Matches</p><h1 className="mt-1 text-xl font-medium text-content-primary">Best-fit records already in Setu Flow</h1><p className="mt-1 text-sm text-content-secondary">These are existing CRM records, not newly discovered companies.</p></div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3"><div className="rounded-card border border-line bg-surface-2 px-4 py-2"><p className="text-caption uppercase text-content-muted">Matches</p><p className="text-lg font-medium">{filtered.length}</p></div><div className="rounded-card border border-line bg-surface-2 px-4 py-2"><p className="text-caption uppercase text-content-muted">Avg. fit</p><p className="text-lg font-medium">{average}%</p></div><div className="rounded-card border border-line bg-surface-2 px-4 py-2"><p className="text-caption uppercase text-content-muted">ICP</p><p className="text-sm font-medium">{icpConfigured ? 'Active' : 'Missing'}</p></div></div>
        </div>
      </div>

      <div className={cn(workspacePanelClass, 'p-4')}>
        <div className="flex items-center gap-2 text-sm font-medium text-content-primary"><Filter className="h-4 w-4" />Filters</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-content-muted" /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search company, market, source" className="min-h-10 w-full rounded-ctl border border-line bg-surface-1 pl-9 pr-3 text-sm" /></label>
          <select value={type} onChange={(e) => { setType(e.target.value as typeof type); setPage(1); }} className="min-h-10 rounded-ctl border border-line bg-surface-1 px-3 text-sm"><option value="all">All records</option><option value="buyer">Buyers only</option><option value="supplier">Suppliers only</option></select>
          <select value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className="min-h-10 rounded-ctl border border-line bg-surface-1 px-3 text-sm"><option value="all">All countries</option>{countries.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={contact} onChange={(e) => { setContact(e.target.value as typeof contact); setPage(1); }} className="min-h-10 rounded-ctl border border-line bg-surface-1 px-3 text-sm"><option value="all">Any contact state</option><option value="not_contacted">Not contacted</option><option value="contacted">Contacted</option></select>
          <label className="flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-surface-1 px-3 text-sm"><span>Min fit</span><input type="range" min="40" max="90" step="10" value={minFit} onChange={(e) => { setMinFit(Number(e.target.value)); setPage(1); }} /><strong>{minFit}%</strong></label>
        </div>
      </div>

      <div className={cn(workspacePanelClass, 'overflow-hidden')}>
        {!visible.length ? <div className="p-8 text-center"><Users className="mx-auto h-8 w-8 text-content-muted" /><p className="mt-3 text-sm text-content-secondary">{icpConfigured ? 'No CRM records match the selected filters.' : 'Set up an ICP before running CRM matching.'}</p></div> : <div className="divide-y divide-line">{visible.map((item) => <article key={item.leadId} className="grid gap-3 p-4 lg:grid-cols-[1.3fr_.8fr_.7fr_1fr_auto] lg:items-center"><div><p className="text-sm font-medium text-content-primary">{item.label}</p><p className="mt-1 text-xs text-content-muted">{item.country || 'Country missing'} · {item.leadType} · {item.companyType || 'Type not recorded'}</p></div><div><p className="text-caption uppercase text-content-muted">Source</p><p className="mt-1 text-sm">{item.signalSource}</p></div><div><p className="text-caption uppercase text-content-muted">Fit</p><p className="mt-1 text-sm font-medium text-success-fg">{item.fitScore.score}%</p><p className="text-[11px] text-content-muted">{item.scoreVersion}</p></div><div><p className="text-caption uppercase text-content-muted">Why</p><p className="mt-1 line-clamp-2 text-xs text-content-secondary">{item.fitScore.reasons?.[0] || 'Matches the active ICP.'}</p>{item.missingData.length ? <p className="mt-1 text-[11px] text-warning-fg">Missing: {item.missingData.join(', ')}</p> : null}</div><Link href={`/leads/${item.leadId}`} className="inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium text-brand-700 hover:bg-surface-2">Review<ArrowRight className="h-3.5 w-3.5" /></Link></article>)}</div>}
        <div className="flex items-center justify-between border-t border-line p-3 text-xs text-content-muted"><span>Showing {visible.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><button disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-ctl border border-line px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {safePage} of {totalPages}</span><button disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-ctl border border-line px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>
    </section>
  );
}
