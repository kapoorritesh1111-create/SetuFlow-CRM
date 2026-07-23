'use client';

import { useMemo, useState } from 'react';
import { Compass, Database, Filter, Plus, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass, workspaceFieldSurfaceClass } from '@/components/ui/workspace-surfaces';
import { GrowthReviewDrawer, DrawerSection } from '@/features/setu-guru/growth-review-drawer';
import { cn } from '@/lib/utils';

export type DiscoveryCampaign = { id: string; name: string; status: string; created_at: string; updated_at: string };
export type OpportunityContact = { id: string; full_name: string | null; title: string | null; email: string | null; phone: string | null; source_url: string | null; confidence: number | null; verification_state: string };
export type OpportunityHistoryEntry = { id: string; action: string; details: Record<string, unknown> | null; actor_user_id: string | null; created_at: string };
export type ExternalOpportunity = {
  id: string;
  campaign_id: string | null;
  job_id: string | null;
  company_name: string;
  country: string | null;
  company_type: string | null;
  website_url: string | null;
  primary_domain: string | null;
  source_label: string;
  source_url: string | null;
  source_evidence: Array<Record<string, unknown>>;
  verification_state: string;
  duplicate_state: string;
  duplicate_reasons: string[];
  matched_lead_id: string | null;
  fit_score: number;
  fit_version: string;
  fit_reasons: string[];
  fit_penalties: string[];
  missing_data: string[];
  review_status: string;
  review_note: string | null;
  contacted_at: string | null;
  responded_at: string | null;
  qualified_at: string | null;
  next_follow_up_at: string | null;
  follow_up_recommendation_id: string | null;
  converted_lead_id: string | null;
  converted_lead_type: string | null;
  created_at: string;
  contacts: OpportunityContact[];
};

const REVIEW_LABELS: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  verified: 'Verified',
  rejected: 'Rejected',
  approved: 'Approved',
  outreach_ready: 'Outreach ready',
  contacted: 'Contacted',
  responded: 'Responded',
  qualified: 'Qualified',
  nurture: 'Nurture',
  converted: 'Converted',
  dismissed: 'Dismissed',
  archived: 'Archived',
};

export function ExternalDiscoveryWorkspace({ campaigns, opportunities }: { campaigns: DiscoveryCampaign[]; opportunities: ExternalOpportunity[] }) {
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [duplicateFilter, setDuplicateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minFit, setMinFit] = useState(0);
  const [sortBy, setSortBy] = useState<'fit' | 'newest' | 'company' | 'country' | 'status'>('fit');
  const [active, setActive] = useState<ExternalOpportunity | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);

  const sources = useMemo(() => Array.from(new Set(opportunities.map((o) => o.source_label).filter(Boolean))).sort(), [opportunities]);
  const countries = useMemo(() => Array.from(new Set(opportunities.map((o) => o.country).filter(Boolean) as string[])).sort(), [opportunities]);
  const companyTypes = useMemo(() => Array.from(new Set(opportunities.map((o) => o.company_type).filter(Boolean) as string[])).sort(), [opportunities]);

  const filtered = useMemo(() => {
    const rows = opportunities.filter((item) => {
      if (campaignFilter !== 'all' && item.campaign_id !== campaignFilter) return false;
      if (sourceFilter !== 'all' && item.source_label !== sourceFilter) return false;
      if (countryFilter !== 'all' && item.country !== countryFilter) return false;
      if (typeFilter !== 'all' && item.company_type !== typeFilter) return false;
      if (verificationFilter !== 'all' && item.verification_state !== verificationFilter) return false;
      if (duplicateFilter !== 'all' && item.duplicate_state !== duplicateFilter) return false;
      if (statusFilter !== 'all' && item.review_status !== statusFilter) return false;
      if (item.fit_score < minFit) return false;
      if (search && !`${item.company_name} ${item.country ?? ''} ${item.company_type ?? ''} ${item.source_label}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const sorted = [...rows];
    if (sortBy === 'fit') sorted.sort((a, b) => b.fit_score - a.fit_score);
    else if (sortBy === 'newest') sorted.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    else if (sortBy === 'company') sorted.sort((a, b) => a.company_name.localeCompare(b.company_name));
    else if (sortBy === 'country') sorted.sort((a, b) => (a.country ?? '').localeCompare(b.country ?? ''));
    else if (sortBy === 'status') sorted.sort((a, b) => a.review_status.localeCompare(b.review_status));
    return sorted;
  }, [opportunities, campaignFilter, sourceFilter, countryFilter, typeFilter, verificationFilter, duplicateFilter, statusFilter, minFit, search, sortBy]);

  const metrics = useMemo(() => {
    const total = opportunities.length;
    const byStatus = (status: string) => opportunities.filter((o) => o.review_status === status).length;
    const verified = opportunities.filter((o) => o.verification_state !== 'unverified').length;
    const duplicates = opportunities.filter((o) => o.duplicate_state !== 'new').length;
    const converted = byStatus('converted');
    return {
      total,
      new: byStatus('new'),
      reviewing: byStatus('reviewing'),
      approved: byStatus('approved'),
      outreachReady: byStatus('outreach_ready'),
      converted,
      verified,
      duplicates,
      conversionRate: total ? Math.round((converted / total) * 100) : 0,
      verificationRate: total ? Math.round((verified / total) * 100) : 0,
    };
  }, [opportunities]);

  const activeCampaign = campaigns.find((c) => c.id === campaignFilter) ?? campaigns[0];

  return (
    <section className="space-y-4" aria-label="External Discovery results workspace">
      <div className={cn(workspacePanelClass, 'p-5')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">External Discovery</p>
            <h1 className="mt-1 text-xl font-medium text-content-primary">New companies found outside your CRM</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-secondary">Results remain separate from leads until a user reviews and approves conversion. Every displayed fact keeps its source and verification state.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowNewCampaign((v) => !v)} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-3 text-xs font-medium', workspacePrimaryButtonClass)}><Plus className="h-3.5 w-3.5" />New campaign</button>
            <Compass className="h-7 w-7 text-brand-700" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Prospects" value={metrics.total} />
          <Metric label="New" value={metrics.new} />
          <Metric label="In review" value={metrics.reviewing} />
          <Metric label="Approved" value={metrics.approved} />
          <Metric label="Outreach ready" value={metrics.outreachReady} />
          <Metric label="Converted" value={metrics.converted} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Metric label="Verification rate" value={`${metrics.verificationRate}%`} />
          <Metric label="Conversion rate" value={`${metrics.conversionRate}%`} />
          <Metric label="Possible/confirmed duplicates" value={metrics.duplicates} />
        </div>

        {showNewCampaign ? <NewCampaignForm onCreated={() => { setShowNewCampaign(false); window.location.reload(); }} onCancel={() => setShowNewCampaign(false)} /> : null}
      </div>

      {campaigns.length ? <CampaignList campaigns={campaigns} activeCampaignId={activeCampaign?.id ?? null} onSelect={(id) => setCampaignFilter(id)} onRan={() => window.location.reload()} /> : null}

      <div className={cn(workspacePanelClass, 'p-4')}>
        <div className="flex items-center gap-2 text-sm font-medium text-content-primary"><Filter className="h-4 w-4" />Filters</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-content-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, market, source" className={cn('min-h-10 w-full rounded-ctl border pl-9 pr-3 text-sm', workspaceFieldSurfaceClass)} /></label>
          <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All campaigns</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All providers/sources</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All company types</option>{companyTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">Any verification</option><option value="unverified">Unverified</option><option value="source_verified">Source verified</option><option value="company_verified">Company verified</option><option value="contact_verified">Contact verified</option></select>
          <select value={duplicateFilter} onChange={(e) => setDuplicateFilter(e.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">Any duplicate state</option><option value="new">New</option><option value="possible_duplicate">Possible duplicate</option><option value="confirmed_duplicate">Confirmed duplicate</option></select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">Any review status</option>{Object.entries(REVIEW_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="fit">Sort: fit score</option><option value="newest">Sort: newest</option><option value="company">Sort: company</option><option value="country">Sort: country</option><option value="status">Sort: status</option></select>
          <label className="flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-surface-1 px-3 text-sm"><span>Min fit</span><input type="range" min="0" max="90" step="10" value={minFit} onChange={(e) => setMinFit(Number(e.target.value))} /><strong>{minFit}%</strong></label>
        </div>
      </div>

      <div className={cn(workspacePanelClass, 'overflow-hidden')}>
        <div className="flex items-center justify-between border-b border-line p-4">
          <div><h2 className="text-sm font-medium text-content-primary">Discovery results ({filtered.length})</h2><p className="mt-1 text-xs text-content-muted">Nothing is saved to your CRM, verified, or sent without your approval.</p></div>
          <div className="flex items-center gap-2 text-xs text-content-muted"><Database className="h-4 w-4" />Provenance preserved</div>
        </div>
        {!filtered.length ? (
          <div className="p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-content-muted" />
            <p className="mt-3 text-sm text-content-secondary">{opportunities.length ? 'No results match the selected filters.' : 'No external results are available yet. Start a campaign and run a research job to populate this list.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((item) => (
              <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1.3fr_.8fr_.6fr_.7fr_.7fr_auto] lg:items-center">
                <div><p className="text-sm font-medium text-content-primary">{item.company_name}</p><p className="mt-1 text-xs text-content-muted">{item.country || 'Country missing'} · {item.company_type || 'Type not recorded'}</p></div>
                <div><p className="text-caption uppercase text-content-muted">Source</p><p className="mt-1 text-sm">{item.source_label}</p></div>
                <div><p className="text-caption uppercase text-content-muted">Fit</p><p className="mt-1 text-sm font-medium text-success-fg">{item.fit_score}%</p></div>
                <div><p className="text-caption uppercase text-content-muted">Verification</p><p className="mt-1 text-sm capitalize">{item.verification_state.replaceAll('_', ' ')}</p></div>
                <div><p className="text-caption uppercase text-content-muted">Status</p><p className="mt-1 text-sm capitalize">{REVIEW_LABELS[item.review_status] ?? item.review_status}</p>{item.duplicate_state !== 'new' ? <p className="mt-1 text-[11px] text-warning-fg capitalize">{item.duplicate_state.replaceAll('_', ' ')}</p> : null}</div>
                <button type="button" onClick={() => setActive(item)} className={cn('inline-flex min-h-9 items-center justify-center rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Review</button>
              </article>
            ))}
          </div>
        )}
      </div>

      <GrowthReviewDrawer open={Boolean(active)} onClose={() => setActive(null)} eyebrow="External prospect" title={active?.company_name ?? ''}>
        {active ? <OpportunityReviewPanel item={active} onClose={() => setActive(null)} /> : null}
      </GrowthReviewDrawer>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-line bg-surface-2 p-3">
      <p className="text-caption uppercase text-content-muted">{label}</p>
      <p className="mt-1 text-lg font-medium text-content-primary">{value}</p>
    </div>
  );
}

function NewCampaignForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit() {
    setStatus('saving');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'The campaign could not be created.');
      }
      onCreated();
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'The campaign could not be created.');
    }
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface-2 p-4">
      <p className="text-sm font-medium text-content-primary">Start an External Discovery campaign</p>
      <p className="mt-1 text-xs text-content-muted">The campaign snapshots your active ICP profile. Requires an ICP to be configured first.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className={cn('min-h-9 min-w-[220px] flex-1 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} />
        <button type="button" disabled={status === 'saving' || name.trim().length < 3} onClick={submit} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspacePrimaryButtonClass)}>{status === 'saving' ? 'Creating…' : 'Create campaign'}</button>
        <button type="button" onClick={onCancel} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Cancel</button>
      </div>
      {status === 'error' ? <p className="mt-2 text-xs text-danger-fg">{errorMessage}</p> : null}
    </div>
  );
}

function CampaignList({ campaigns, activeCampaignId, onSelect, onRan }: { campaigns: DiscoveryCampaign[]; activeCampaignId: string | null; onSelect: (id: string) => void; onRan: () => void }) {
  return (
    <div className={cn(workspacePanelClass, 'overflow-hidden')}>
      <div className="border-b border-line p-4"><h2 className="text-sm font-medium text-content-primary">Discovery campaigns</h2><p className="mt-1 text-xs text-content-muted">Track every campaign's owner, status, and prospects. Running a job uses the honest disabled-provider state unless a licensed provider is connected.</p></div>
      <div className="divide-y divide-line">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className={cn('flex flex-wrap items-center justify-between gap-3 p-3 text-sm', campaign.id === activeCampaignId ? 'bg-info-bg/40' : '')}>
            <button type="button" onClick={() => onSelect(campaign.id)} className="text-left font-medium text-content-primary hover:underline">{campaign.name}</button>
            <span className="text-xs capitalize text-content-muted">{campaign.status}</span>
            <RunJobButton campaignId={campaign.id} onRan={onRan} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RunJobButton({ campaignId, onRan }: { campaignId: string; onRan: () => void }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setStatus('running');
    setMessage(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, providerKey: 'manual' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The research job could not be run.');
      setMessage(payload.result?.message ?? 'Job completed.');
      onRan();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'The research job could not be run.');
      return;
    }
    setStatus('idle');
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={run} disabled={status === 'running'} className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-ctl px-2.5 text-xs font-medium disabled:opacity-60', workspaceSecondaryButtonClass)}><RefreshCcw className={cn('h-3.5 w-3.5', status === 'running' ? 'animate-spin' : '')} />Run job</button>
      {message ? <span className="max-w-[220px] truncate text-[11px] text-content-muted" title={message}>{message}</span> : null}
    </div>
  );
}

function OpportunityReviewPanel({ item, onClose }: { item: ExternalOpportunity; onClose: () => void }) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>('buyer');
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'linkedin' | 'call'>('email');
  const [subject, setSubject] = useState(`Introduction — ${item.company_name}`);
  const [body, setBody] = useState('');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [researchNote, setResearchNote] = useState('');
  const [researchStatus, setResearchStatus] = useState<'idle' | 'saving' | 'sent' | 'error'>('idle');
  const [history, setHistory] = useState<OpportunityHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function runReviewAction(action: string) {
    setBusyAction(action);
    setActionMessage(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: item.id, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'That action could not be completed.');
      setActionMessage(`Status updated to ${REVIEW_LABELS[payload.opportunity?.review_status] ?? payload.opportunity?.review_status}. Refresh to see the full list update.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'That action could not be completed.');
    } finally {
      setBusyAction(null);
    }
  }

  async function convert() {
    setBusyAction('convert');
    setActionMessage(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: item.id, leadType }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The opportunity could not be converted.');
      setActionMessage(payload.alreadyConverted ? 'Already converted to a CRM lead.' : `Converted to a ${leadType} lead. Refresh to open the new record.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'The opportunity could not be converted.');
    } finally {
      setBusyAction(null);
    }
  }

  async function saveDraft() {
    setDraftStatus('saving');
    setDraftError(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: item.id, channel, subject: channel === 'email' ? subject : undefined, body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The draft could not be saved.');
      setDraftStatus('saved');
      setSavedDraftId(payload.draft?.id ?? null);
      setSendStatus('idle');
      setSendMessage(null);
    } catch (error) {
      setDraftStatus('error');
      setDraftError(error instanceof Error ? error.message : 'The draft could not be saved.');
    }
  }

  async function approveAndSend() {
    if (!savedDraftId) return;
    setSendStatus('sending');
    setSendMessage(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: savedDraftId, opportunityId: item.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The draft could not be sent.');
      setSendStatus('done');
      setSendMessage(
        payload.queued
          ? 'Sent and the prospect was moved to Contacted. Refresh to see the updated status.'
          : `Approved, but not sent automatically: ${payload.reason}`,
      );
    } catch (error) {
      setSendStatus('error');
      setSendMessage(error instanceof Error ? error.message : 'The draft could not be sent.');
    }
  }

  async function scheduleFollowUp() {
    if (!followUpDate) return;
    setFollowUpStatus('saving');
    try {
      const response = await fetch('/api/setu-guru/external-discovery/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: item.id, dueAt: followUpDate, note: followUpNote || undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The follow-up could not be scheduled.');
      setFollowUpStatus('idle');
      setActionMessage('Follow-up scheduled — it will appear in the Work Queue.');
    } catch (error) {
      setFollowUpStatus('error');
      setActionMessage(error instanceof Error ? error.message : 'The follow-up could not be scheduled.');
    }
  }

  async function cancelFollowUp() {
    setFollowUpStatus('saving');
    try {
      const response = await fetch('/api/setu-guru/external-discovery/follow-up', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: item.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'The follow-up could not be cancelled.');
      }
      setFollowUpStatus('idle');
      setActionMessage('Follow-up cancelled.');
    } catch (error) {
      setFollowUpStatus('error');
      setActionMessage(error instanceof Error ? error.message : 'The follow-up could not be cancelled.');
    }
  }

  async function requestResearch() {
    if (!researchNote.trim()) return;
    setResearchStatus('saving');
    try {
      const response = await fetch('/api/setu-guru/external-discovery/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: item.id, note: researchNote }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'The request could not be saved.');
      }
      setResearchStatus('sent');
      setResearchNote('');
    } catch {
      setResearchStatus('error');
    }
  }

  async function loadHistory() {
    setShowHistory((value) => !value);
    if (history || historyLoading) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/setu-guru/external-discovery/history?opportunityId=${item.id}`);
      const payload = await response.json().catch(() => ({}));
      setHistory(response.ok ? (payload.history ?? []) : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  const canConvert = item.review_status === 'approved' || item.review_status === 'outreach_ready';
  const canOutreach = !['converted', 'dismissed', 'rejected', 'archived'].includes(item.review_status);
  const risks = [
    ...(item.duplicate_state !== 'new' ? [`${item.duplicate_state === 'confirmed_duplicate' ? 'Confirmed' : 'Possible'} duplicate of an existing CRM or discovery record.`] : []),
    ...(item.verification_state === 'unverified' ? ['No verification evidence yet — treat all facts as unconfirmed.'] : []),
    ...(item.fit_penalties ?? []),
    ...(item.missing_data?.length ? [`Missing: ${item.missing_data.join(', ')}.`] : []),
  ];

  return (
    <div className="space-y-5">
      <DrawerSection title="Company summary">
        <p>{item.country || 'Country not recorded'} · {item.company_type || 'Type not recorded'}</p>
        {item.website_url ? <p className="mt-1 text-xs"><a href={item.website_url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{item.primary_domain ?? item.website_url}</a></p> : null}
        <p className="mt-1 text-xs text-content-muted">Source: {item.source_label}{item.source_url ? <> · <a href={item.source_url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">source link</a></> : null}</p>
        <p className="mt-1 text-xs text-content-muted">Status: {REVIEW_LABELS[item.review_status] ?? item.review_status}</p>
        {item.next_follow_up_at ? <p className="mt-1 text-xs text-brand-700">Follow-up scheduled for {new Date(item.next_follow_up_at).toLocaleString()}</p> : null}
      </DrawerSection>

      <DrawerSection title="Source evidence">
        {item.source_evidence?.length ? (
          <ul className="space-y-1.5 text-xs">
            {item.source_evidence.map((entry, index) => (
              <li key={index} className="rounded-ctl border border-line bg-surface-2 p-2">{JSON.stringify(entry)}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-warning-fg">No evidence captured yet — this prospect cannot be marked outreach ready until evidence exists.</p>
        )}
      </DrawerSection>

      <DrawerSection title="Contacts">
        {item.contacts.length ? (
          <ul className="space-y-1.5 text-xs">
            {item.contacts.map((contact) => (
              <li key={contact.id} className="rounded-ctl border border-line bg-surface-2 p-2">
                <p className="font-medium text-content-primary">{contact.full_name || 'Unnamed contact'}{contact.title ? ` · ${contact.title}` : ''}</p>
                <p className="text-content-muted">{[contact.email, contact.phone].filter(Boolean).join(' · ') || 'No contact details on file'}</p>
                <p className="mt-0.5 text-[11px] capitalize text-content-muted">{contact.verification_state.replaceAll('_', ' ')}{typeof contact.confidence === 'number' ? ` · ${contact.confidence}% confidence` : ''}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-content-muted">No verified contacts captured yet.</p>
        )}
      </DrawerSection>

      <DrawerSection title="Verification">
        <p className="capitalize">{item.verification_state.replaceAll('_', ' ')}</p>
      </DrawerSection>

      <DrawerSection title="Duplicate analysis">
        <p className="capitalize">{item.duplicate_state.replaceAll('_', ' ')}</p>
        {item.duplicate_reasons?.length ? <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">{item.duplicate_reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}
        {item.matched_lead_id ? <p className="mt-1 text-xs text-warning-fg">Matches existing CRM lead. Resolve before converting.</p> : null}
      </DrawerSection>

      <DrawerSection title="Fit score breakdown">
        <p className="text-lg font-medium text-content-primary">{item.fit_score}%<span className="ml-2 text-xs font-normal text-content-muted">{item.fit_version}</span></p>
        {item.fit_reasons?.length ? <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">{item.fit_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
      </DrawerSection>

      {risks.length ? (
        <DrawerSection title="Risks and flags">
          <ul className="list-disc space-y-1 pl-4 text-xs text-warning-fg">{risks.map((risk, i) => <li key={i}>{risk}</li>)}</ul>
        </DrawerSection>
      ) : (
        <DrawerSection title="Risks and flags"><p className="text-xs text-success-fg">No flags on this prospect right now.</p></DrawerSection>
      )}

      <DrawerSection title="Review actions (human approval required)">
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Start review" onClick={() => runReviewAction('start_review')} busy={busyAction === 'start_review'} />
          <ActionButton label="Verify" onClick={() => runReviewAction('verify')} busy={busyAction === 'verify'} />
          <ActionButton label="Approve" onClick={() => runReviewAction('approve')} busy={busyAction === 'approve'} primary />
          <ActionButton label="Prepare outreach" onClick={() => runReviewAction('prepare_outreach')} busy={busyAction === 'prepare_outreach'} />
          <ActionButton label="Mark contacted" onClick={() => runReviewAction('mark_contacted')} busy={busyAction === 'mark_contacted'} />
          <ActionButton label="Record response" onClick={() => runReviewAction('record_response')} busy={busyAction === 'record_response'} />
          <ActionButton label="Qualify" onClick={() => runReviewAction('qualify')} busy={busyAction === 'qualify'} primary />
          <ActionButton label="Move to nurture" onClick={() => runReviewAction('move_to_nurture')} busy={busyAction === 'move_to_nurture'} />
          <ActionButton label="Reject" onClick={() => runReviewAction('reject')} busy={busyAction === 'reject'} danger />
          <ActionButton label="Dismiss" onClick={() => runReviewAction('dismiss')} busy={busyAction === 'dismiss'} danger />
          <ActionButton label="Archive" onClick={() => runReviewAction('archive')} busy={busyAction === 'archive'} />
        </div>
        {actionMessage ? <p className="mt-2 text-xs text-content-secondary" role="status" aria-live="polite">{actionMessage}</p> : null}
      </DrawerSection>

      {canOutreach ? (
        <DrawerSection title="Outreach draft">
          <div className="space-y-2">
            <select value={channel} onChange={(e) => { setChannel(e.target.value as typeof channel); setSavedDraftId(null); setSendStatus('idle'); }} className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="linkedin">LinkedIn note</option>
              <option value="call">Call note</option>
            </select>
            {channel === 'email' ? <input value={subject} onChange={(e) => setSubject(e.target.value)} className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} placeholder="Subject" /> : null}
            <textarea value={body} onChange={(e) => { setBody(e.target.value); setSavedDraftId(null); setSendStatus('idle'); }} rows={5} placeholder="Draft your message." className={cn('w-full rounded-ctl border p-3 text-sm', workspaceFieldSurfaceClass)} />
            <p className="text-[11px] text-content-muted">Saving writes a draft to communications. Approve &amp; send is a separate, explicit step — nothing is sent automatically.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={saveDraft} disabled={draftStatus === 'saving' || !body.trim()} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspacePrimaryButtonClass)}>{draftStatus === 'saving' ? 'Saving…' : 'Save draft'}</button>
              {savedDraftId ? (
                <button type="button" onClick={approveAndSend} disabled={sendStatus === 'sending' || sendStatus === 'done'} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspaceSecondaryButtonClass)}>{sendStatus === 'sending' ? 'Sending…' : 'Approve & send'}</button>
              ) : null}
              {draftStatus === 'saved' && !savedDraftId ? <span className="text-xs text-success-fg">Draft saved.</span> : null}
              {draftStatus === 'error' ? <span className="text-xs text-danger-fg">{draftError}</span> : null}
              {sendMessage ? <span className={cn('text-xs', sendStatus === 'error' ? 'text-danger-fg' : 'text-content-secondary')} role="status" aria-live="polite">{sendMessage}</span> : null}
            </div>
          </div>
        </DrawerSection>
      ) : null}

      <DrawerSection title="Follow-up">
        {item.next_follow_up_at ? (
          <div className="space-y-2">
            <p className="text-xs">Scheduled for {new Date(item.next_follow_up_at).toLocaleString()}.</p>
            <button type="button" onClick={cancelFollowUp} disabled={followUpStatus === 'saving'} className={cn('inline-flex min-h-8 items-center rounded-ctl px-2.5 text-xs font-medium disabled:opacity-60', workspaceSecondaryButtonClass)}>Cancel follow-up</button>
          </div>
        ) : (
          <div className="space-y-2">
            <input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} />
            <input value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="Note (optional)" className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} />
            <button type="button" onClick={scheduleFollowUp} disabled={!followUpDate || followUpStatus === 'saving'} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspaceSecondaryButtonClass)}>{followUpStatus === 'saving' ? 'Scheduling…' : 'Schedule follow-up'}</button>
            <p className="text-[11px] text-content-muted">Appears in the Growth Work Queue and Completed history like any other action.</p>
          </div>
        )}
      </DrawerSection>

      <DrawerSection title="Request deeper research">
        <div className="space-y-2">
          <textarea value={researchNote} onChange={(e) => setResearchNote(e.target.value)} rows={2} placeholder="What should be verified further?" className={cn('w-full rounded-ctl border p-2 text-sm', workspaceFieldSurfaceClass)} />
          <button type="button" onClick={requestResearch} disabled={!researchNote.trim() || researchStatus === 'saving'} className={cn('inline-flex min-h-8 items-center rounded-ctl px-2.5 text-xs font-medium disabled:opacity-60', workspaceSecondaryButtonClass)}>{researchStatus === 'saving' ? 'Saving…' : 'Log research request'}</button>
          {researchStatus === 'sent' ? <span className="ml-2 text-xs text-success-fg">Logged to the activity timeline.</span> : null}
        </div>
      </DrawerSection>

      <DrawerSection title="Convert to CRM">
        {item.converted_lead_id ? (
          <p className="text-xs text-success-fg">Already converted to a {item.converted_lead_type} lead.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-content-muted">{canConvert ? 'Approve or mark outreach ready before converting.' : `Requires status Approved or Outreach ready. Current status: ${REVIEW_LABELS[item.review_status] ?? item.review_status}.`}</p>
            <div className="flex items-center gap-2">
              <select value={leadType} onChange={(e) => setLeadType(e.target.value as typeof leadType)} className={cn('min-h-9 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}>
                <option value="buyer">Buyer</option>
                <option value="supplier">Supplier</option>
              </select>
              <button type="button" onClick={convert} disabled={!canConvert || busyAction === 'convert'} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium disabled:opacity-50', workspacePrimaryButtonClass)}>{busyAction === 'convert' ? 'Converting…' : 'Convert to lead'}</button>
            </div>
          </div>
        )}
      </DrawerSection>

      <DrawerSection title="Activity timeline">
        <button type="button" onClick={loadHistory} className={cn('inline-flex min-h-8 items-center rounded-ctl px-2.5 text-xs font-medium', workspaceSecondaryButtonClass)}>{showHistory ? 'Hide' : 'View'} activity</button>
        {showHistory ? (
          historyLoading ? (
            <p className="mt-2 text-xs text-content-muted">Loading…</p>
          ) : history?.length ? (
            <ul className="mt-2 space-y-1.5 text-xs">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-ctl border border-line bg-surface-2 p-2">
                  <p className="font-medium capitalize text-content-primary">{entry.action.replaceAll('_', ' ')}</p>
                  <p className="text-[11px] text-content-muted">{new Date(entry.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-content-muted">No activity recorded yet.</p>
          )
        ) : null}
      </DrawerSection>

      <div className="flex justify-end border-t border-line pt-4">
        <button type="button" onClick={onClose} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Close</button>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, busy, primary, danger }: { label: string; onClick: () => void; busy?: boolean; primary?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'inline-flex min-h-8 items-center rounded-ctl px-2.5 text-xs font-medium disabled:opacity-60',
        primary ? workspacePrimaryButtonClass : danger ? 'border border-danger-border bg-danger-bg text-danger-fg transition hover:opacity-90' : workspaceSecondaryButtonClass,
      )}
    >
      {busy ? '…' : label}
    </button>
  );
}
