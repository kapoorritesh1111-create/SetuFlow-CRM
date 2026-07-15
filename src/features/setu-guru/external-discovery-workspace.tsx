'use client';

import { Compass, Database, ShieldCheck } from 'lucide-react';
import { workspacePanelClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

type Campaign = { id: string; name: string; status: string; created_at: string; updated_at: string };
type ExternalOpportunity = { id: string; campaign_id: string | null; company_name: string; country: string | null; company_type: string | null; source_label: string; source_url: string | null; verification_state: string; duplicate_state: string; fit_score: number; review_status: string; created_at: string };

export function ExternalDiscoveryWorkspace({ campaigns, opportunities }: { campaigns: Campaign[]; opportunities: ExternalOpportunity[] }) {
  const active = campaigns[0];
  const duplicates = opportunities.filter((item) => item.duplicate_state !== 'new').length;
  const verified = opportunities.filter((item) => item.verification_state !== 'unverified').length;
  return (
    <section className="space-y-4" aria-label="External Discovery results workspace">
      <div className={cn(workspacePanelClass, 'p-5')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-medium uppercase tracking-wide text-brand-700">External Discovery</p><h1 className="mt-1 text-xl font-medium text-content-primary">New companies found outside your CRM</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-content-secondary">Results remain separate from leads until a user reviews and approves conversion. Every displayed fact keeps its source and verification state.</p></div>
          <Compass className="h-7 w-7 text-brand-700" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Campaign</p><p className="mt-1 text-sm font-medium">{active?.name || 'No campaign yet'}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Status</p><p className="mt-1 text-sm font-medium capitalize">{active?.status || 'Draft'}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Prospects</p><p className="mt-1 text-xl font-medium">{opportunities.length}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Verified</p><p className="mt-1 text-xl font-medium">{verified}</p></div></div>
      </div>

      <div className={cn(workspacePanelClass, 'overflow-hidden')}>
        <div className="flex items-center justify-between border-b border-line p-4"><div><h2 className="text-sm font-medium text-content-primary">Discovery results</h2><p className="mt-1 text-xs text-content-muted">{duplicates} possible or confirmed duplicates identified before CRM conversion.</p></div><div className="flex items-center gap-2 text-xs text-content-muted"><Database className="h-4 w-4" />Provenance preserved</div></div>
        {!opportunities.length ? <div className="p-10 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-content-muted" /><p className="mt-3 text-sm text-content-secondary">No external results are available yet. Campaign and job entities are ready for an approved provider run.</p></div> : <div className="divide-y divide-line">{opportunities.map((item) => <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1.3fr_.8fr_.7fr_.7fr_.7fr] lg:items-center"><div><p className="text-sm font-medium text-content-primary">{item.company_name}</p><p className="mt-1 text-xs text-content-muted">{item.country || 'Country missing'} · {item.company_type || 'Type not recorded'}</p></div><div><p className="text-caption uppercase text-content-muted">Source</p><p className="mt-1 text-sm">{item.source_label}</p></div><div><p className="text-caption uppercase text-content-muted">Fit</p><p className="mt-1 text-sm font-medium text-success-fg">{item.fit_score}%</p></div><div><p className="text-caption uppercase text-content-muted">Verification</p><p className="mt-1 text-sm capitalize">{item.verification_state.replaceAll('_', ' ')}</p></div><div><p className="text-caption uppercase text-content-muted">Duplicate</p><p className="mt-1 text-sm capitalize">{item.duplicate_state.replaceAll('_', ' ')}</p></div></article>)}</div>}
      </div>
    </section>
  );
}
