'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Filter, Search, ShieldCheck } from 'lucide-react';
import { GrowthReviewDrawer, DrawerSection } from '@/features/setu-guru/growth-review-drawer';
import type { ExternalOpportunity } from '@/features/setu-guru/external-discovery-workspace';
import { workspaceFieldSurfaceClass, workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

export type PremiumExternalOpportunity = ExternalOpportunity & {
  campaign_name?: string | null;
};

const REVIEW_LABELS: Record<string, string> = {
  new: 'New', reviewing: 'Reviewing', verified: 'Verified', rejected: 'Rejected', approved: 'Approved',
  outreach_ready: 'Outreach ready', contacted: 'Contacted', responded: 'Responded', qualified: 'Qualified',
  nurture: 'Nurture', converted: 'Converted', dismissed: 'Dismissed', archived: 'Archived',
};

function valueList(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function evidenceSummary(entry: Record<string, unknown>) {
  return String(entry.text || entry.match_explanation || entry.evidence || entry.summary || entry.signal || JSON.stringify(entry));
}

function evidenceValues(item: PremiumExternalOpportunity, key: string) {
  return Array.from(new Set((item.source_evidence ?? []).flatMap((entry) => valueList(entry[key]))));
}

export function PremiumExternalDiscoveryResults({ opportunities, campaigns }: { opportunities: PremiumExternalOpportunity[]; campaigns: Array<{ id: string; name: string }> }) {
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [active, setActive] = useState<PremiumExternalOpportunity | null>(null);
  const filtered = useMemo(() => opportunities.filter((item) => {
    if (campaignFilter !== 'all' && item.campaign_id !== campaignFilter) return false;
    const corpus = `${item.company_name} ${item.country ?? ''} ${item.company_type ?? ''} ${item.source_label} ${item.fit_reasons.join(' ')}`.toLowerCase();
    return !search || corpus.includes(search.toLowerCase());
  }), [campaignFilter, opportunities, search]);

  return (
    <section className="space-y-4" aria-label="Premium external prospect results">
      <div className={cn(workspacePanelClass, 'p-4')}>
        <div className="flex items-center gap-2 text-sm font-medium text-content-primary"><Filter className="h-4 w-4" />External prospect filters</div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_260px]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-content-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, market, evidence" className={cn('min-h-10 w-full rounded-ctl border pl-9 pr-3 text-sm', workspaceFieldSurfaceClass)} /></label>
          <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All campaigns</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>
        </div>
      </div>

      <div className={cn(workspacePanelClass, 'overflow-hidden')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div><h2 className="text-sm font-medium text-content-primary">External prospects ({filtered.length})</h2><p className="mt-1 text-xs text-content-muted">New source-backed companies outside CRM. Approval is required before conversion or outreach.</p></div>
          <span className="rounded-full bg-info-bg px-3 py-1 text-xs font-medium text-brand-800">Outside CRM until approved</span>
        </div>
        {!filtered.length ? (
          <div className="p-10 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-content-muted" /><p className="mt-3 text-sm font-medium text-content-primary">Filters removed all rows</p><p className="mt-1 text-xs text-content-muted">Results exist, but none match the current campaign or search filters.</p></div>
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {filtered.map((item) => {
              const matchedProducts = evidenceValues(item, 'matched_products');
              const matchedIndustries = evidenceValues(item, 'matched_industries');
              const suggestedRoles = evidenceValues(item, 'suggested_contact_roles');
              return (
                <article key={item.id} className="rounded-card border border-line bg-surface-1 p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-800">External prospect</span><span className="rounded-full bg-surface-2 px-2 py-1 text-[11px] text-content-muted">{item.campaign_name || 'Campaign not recorded'}</span></div><h3 className="mt-3 text-lg font-medium text-content-primary">{item.company_name}</h3><p className="mt-1 text-xs text-content-muted">{item.country || 'Country missing'} · {item.company_type || 'Company type missing'}</p></div><div className="text-right"><p className="text-2xl font-semibold text-success-fg">{item.fit_score}%</p><p className="text-[11px] text-content-muted">fit score</p></div></div>
                  <div className="mt-4 rounded-ctl border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Why this company matches</p><p className="mt-1 text-sm leading-5 text-content-secondary">{item.fit_reasons[0] || 'Source evidence is available for human review.'}</p></div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-caption uppercase text-content-muted">Matched products</p><p className="mt-1 text-xs text-content-secondary">{matchedProducts.join(', ') || 'Review evidence'}</p></div><div><p className="text-caption uppercase text-content-muted">Matched industries</p><p className="mt-1 text-xs text-content-secondary">{matchedIndustries.join(', ') || 'Review evidence'}</p></div></div>
                  <div className="mt-3"><p className="text-caption uppercase text-content-muted">Key evidence</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-content-secondary">{item.source_evidence[0] ? evidenceSummary(item.source_evidence[0]) : 'No evidence summary captured.'}</p></div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-surface-2 px-2 py-1 capitalize">{item.verification_state.replaceAll('_', ' ')}</span><span className={cn('rounded-full px-2 py-1 capitalize', item.duplicate_state === 'new' ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg')}>{item.duplicate_state.replaceAll('_', ' ')}</span><span className="rounded-full bg-surface-2 px-2 py-1">{REVIEW_LABELS[item.review_status] || item.review_status}</span>{item.missing_data.length ? <span className="rounded-full bg-warning-bg px-2 py-1 text-warning-fg">Missing {item.missing_data.length}</span> : null}</div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3"><div className="min-w-0 text-xs"><p className="font-medium text-content-primary">{item.source_label}</p>{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex max-w-[320px] items-center gap-1 truncate text-brand-700 hover:underline">Source URL <ExternalLink className="h-3 w-3" /></a> : <span className="text-warning-fg">Source URL missing</span>}<p className="mt-1 text-[11px] text-content-muted">Suggested roles: {suggestedRoles.join(', ') || item.contacts.map((contact) => contact.title).filter(Boolean).join(', ') || 'Not yet identified'}</p></div><button type="button" onClick={() => setActive(item)} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium', workspacePrimaryButtonClass)}>Review evidence</button></div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <GrowthReviewDrawer open={Boolean(active)} onClose={() => setActive(null)} eyebrow="External prospect · Outside CRM until approved" title={active?.company_name ?? ''}>
        {active ? <PremiumOpportunityReviewPanel item={active} onClose={() => setActive(null)} /> : null}
      </GrowthReviewDrawer>
    </section>
  );
}

function PremiumOpportunityReviewPanel({ item, onClose }: { item: PremiumExternalOpportunity; onClose: () => void }) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>('buyer');
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'linkedin' | 'call'>('email');
  const [subject, setSubject] = useState(`Introduction — ${item.company_name}`);
  const [body, setBody] = useState('');
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [history, setHistory] = useState<Array<{ id: string; action: string; created_at: string }> | null>(null);
  const canConvert = item.review_status === 'approved' || item.review_status === 'outreach_ready';

  async function post(path: string, payload: Record<string, unknown>, action: string) {
    setBusyAction(action); setMessage(null);
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The action could not be completed.');
      setMessage(result.reason || result.message || 'Action completed. Refresh data to see the latest state.');
      return result;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The action could not be completed.'); return null; }
    finally { setBusyAction(null); }
  }

  async function review(action: string) { await post('/api/setu-guru/external-discovery/review', { opportunityId: item.id, action }, action); }
  async function convert() { await post('/api/setu-guru/external-discovery/convert', { opportunityId: item.id, leadType }, 'convert'); }
  async function saveDraft() { const result = await post('/api/setu-guru/external-discovery/outreach', { opportunityId: item.id, channel, subject: channel === 'email' ? subject : undefined, body }, 'draft'); setSavedDraftId(result?.draft?.id ?? null); }
  async function sendDraft() { if (savedDraftId) await post('/api/setu-guru/external-discovery/outreach/send', { opportunityId: item.id, draftId: savedDraftId }, 'send'); }
  async function followUp() { await post('/api/setu-guru/external-discovery/follow-up', { opportunityId: item.id, dueAt: followUpDate }, 'follow-up'); }
  async function loadHistory() { const response = await fetch(`/api/setu-guru/external-discovery/history?opportunityId=${item.id}`); const result = await response.json().catch(() => ({})); setHistory(response.ok ? result.history ?? [] : []); }

  return <div className="space-y-5">
    <DrawerSection title="1. Why this company matches"><ul className="list-disc space-y-1 pl-4 text-xs">{item.fit_reasons.length ? item.fit_reasons.map((reason, index) => <li key={index}>{reason}</li>) : <li>Review the captured source evidence.</li>}</ul></DrawerSection>
    <DrawerSection title="2. Source-backed evidence">{item.source_evidence.length ? <ul className="space-y-2">{item.source_evidence.map((entry, index) => <li key={index} className="rounded-ctl border border-line bg-surface-2 p-3 text-xs">{evidenceSummary(entry)}</li>)}</ul> : <p className="text-xs text-warning-fg">No source evidence captured.</p>}{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Open source <ExternalLink className="h-3 w-3" /></a> : null}</DrawerSection>
    <DrawerSection title="3. Fit score and score explanation"><p className="text-xl font-semibold text-success-fg">{item.fit_score}%</p><p className="text-xs text-content-muted">{item.fit_version}</p>{item.fit_penalties.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-warning-fg">{item.fit_penalties.map((value, index) => <li key={index}>{value}</li>)}</ul> : null}</DrawerSection>
    <DrawerSection title="4. Duplicate warning">{item.duplicate_state === 'new' ? <p className="flex items-center gap-2 text-xs text-success-fg"><CheckCircle2 className="h-4 w-4" />No duplicate detected.</p> : <div className="text-xs text-warning-fg"><p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />{item.duplicate_state.replaceAll('_', ' ')}</p><ul className="mt-1 list-disc pl-4">{item.duplicate_reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div>}</DrawerSection>
    <DrawerSection title="5. Suggested contact roles">{item.contacts.length ? <ul className="space-y-2 text-xs">{item.contacts.map((contact) => <li key={contact.id} className="rounded-ctl border border-line p-2">{contact.full_name || 'Unnamed contact'} · {contact.title || 'Role not recorded'} · {contact.verification_state.replaceAll('_', ' ')}</li>)}</ul> : <p className="text-xs text-content-muted">No verified contact captured yet.</p>}</DrawerSection>
    <DrawerSection title="6. Missing information">{item.missing_data.length ? <ul className="list-disc pl-4 text-xs text-warning-fg">{item.missing_data.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p className="text-xs text-success-fg">No missing-data flags.</p>}</DrawerSection>
    <DrawerSection title="7. Review actions"><div className="flex flex-wrap gap-2">{[['start_review','Start review'],['verify','Verify'],['approve','Approve'],['prepare_outreach','Prepare outreach'],['mark_contacted','Mark contacted'],['record_response','Record response'],['qualify','Qualify'],['move_to_nurture','Nurture'],['reject','Reject'],['dismiss','Dismiss'],['archive','Archive']].map(([action,label]) => <button key={action} type="button" disabled={Boolean(busyAction)} onClick={() => review(action)} className={cn('min-h-8 rounded-ctl px-2.5 text-xs font-medium disabled:opacity-50', action === 'approve' || action === 'qualify' ? workspacePrimaryButtonClass : workspaceSecondaryButtonClass)}>{busyAction === action ? 'Working…' : label}</button>)}</div>{message ? <p className="mt-2 text-xs text-content-secondary" role="status">{message}</p> : null}</DrawerSection>
    <DrawerSection title="8. Convert to CRM"><p className="mb-2 text-xs text-content-muted">Conversion requires an explicit click and status Approved or Outreach ready.</p><div className="flex gap-2"><select value={leadType} onChange={(event) => setLeadType(event.target.value as 'buyer' | 'supplier')} className={cn('min-h-9 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="buyer">Buyer</option><option value="supplier">Supplier</option></select><button type="button" disabled={!canConvert || Boolean(busyAction)} onClick={convert} className={cn('min-h-9 rounded-ctl px-3 text-xs font-medium disabled:opacity-50', workspacePrimaryButtonClass)}>Convert to lead</button></div></DrawerSection>
    <DrawerSection title="9. Outreach draft"><select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)} className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="linkedin">LinkedIn</option><option value="call">Call note</option></select>{channel === 'email' ? <input value={subject} onChange={(event) => setSubject(event.target.value)} className={cn('mt-2 min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} /> : null}<textarea value={body} onChange={(event) => { setBody(event.target.value); setSavedDraftId(null); }} rows={4} className={cn('mt-2 w-full rounded-ctl border p-3 text-sm', workspaceFieldSurfaceClass)} placeholder="Draft message" /><p className="mt-1 text-[11px] text-content-muted">Saving creates a draft only. Sending requires a separate explicit approval.</p><div className="mt-2 flex gap-2"><button type="button" disabled={!body.trim() || Boolean(busyAction)} onClick={saveDraft} className={cn('min-h-9 rounded-ctl px-3 text-xs font-medium', workspacePrimaryButtonClass)}>Save draft</button>{savedDraftId ? <button type="button" disabled={Boolean(busyAction)} onClick={sendDraft} className={cn('min-h-9 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Approve &amp; send</button> : null}</div></DrawerSection>
    <DrawerSection title="10. Follow-up"><div className="flex gap-2"><input type="datetime-local" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className={cn('min-h-9 flex-1 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} /><button type="button" disabled={!followUpDate || Boolean(busyAction)} onClick={followUp} className={cn('min-h-9 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Schedule</button></div></DrawerSection>
    <DrawerSection title="11. History and audit"><button type="button" onClick={loadHistory} className={cn('min-h-8 rounded-ctl px-2.5 text-xs font-medium', workspaceSecondaryButtonClass)}>Load history</button>{history ? <ul className="mt-2 space-y-1 text-xs">{history.length ? history.map((entry) => <li key={entry.id} className="rounded-ctl border border-line p-2">{entry.action.replaceAll('_', ' ')} · {new Date(entry.created_at).toLocaleString()}</li>) : <li>No activity recorded.</li>}</ul> : null}</DrawerSection>
    <div className="flex justify-end border-t border-line pt-4"><button type="button" onClick={onClose} className={cn('min-h-9 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Close</button></div>
  </div>;
}
