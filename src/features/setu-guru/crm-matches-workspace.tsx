'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Filter, Search, Send, Users } from 'lucide-react';
import { workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass, workspaceFieldSurfaceClass } from '@/components/ui/workspace-surfaces';
import { GrowthReviewDrawer, DrawerSection } from '@/features/setu-guru/growth-review-drawer';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export function CrmMatchesWorkspace({
  opportunities,
  icpConfigured,
  currentUserId,
}: {
  opportunities: OpportunityCard[];
  icpConfigured: boolean;
  currentUserId?: string | null;
}) {
  const [type, setType] = useState<'all' | 'buyer' | 'supplier'>('all');
  const [country, setCountry] = useState('all');
  const [source, setSource] = useState('all');
  const [owner, setOwner] = useState<'all' | 'mine'>('all');
  const [contact, setContact] = useState<'all' | 'contacted' | 'not_contacted'>('all');
  const [minFit, setMinFit] = useState(40);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<OpportunityCard | null>(null);

  const countries = useMemo(() => Array.from(new Set(opportunities.map((item) => item.country).filter(Boolean) as string[])).sort(), [opportunities]);
  const sources = useMemo(() => Array.from(new Set(opportunities.map((item) => item.signalSource).filter(Boolean))).sort(), [opportunities]);

  const filtered = useMemo(
    () =>
      opportunities.filter((item) => {
        if (type !== 'all' && item.leadType !== type) return false;
        if (country !== 'all' && item.country !== country) return false;
        if (source !== 'all' && item.signalSource !== source) return false;
        if (owner === 'mine' && item.ownerUserId !== currentUserId) return false;
        if (contact !== 'all' && item.contactState !== contact) return false;
        if (item.fitScore.score < minFit) return false;
        if (query && !`${item.label} ${item.country ?? ''} ${item.companyType ?? ''} ${item.signalSource}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [opportunities, type, country, source, owner, contact, minFit, query, currentUserId],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const average = filtered.length ? Math.round(filtered.reduce((sum, item) => sum + item.fitScore.score, 0) / filtered.length) : 0;

  return (
    <section className="space-y-4" aria-label="CRM Matches workspace">
      <div className={cn(workspacePanelClass, 'p-4')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">CRM Matches</p>
            <h1 className="mt-1 text-xl font-medium text-content-primary">Best-fit records already in Setu Flow</h1>
            <p className="mt-1 text-sm text-content-secondary">These are existing CRM records, not newly discovered companies.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
            <div className="rounded-card border border-line bg-surface-2 px-4 py-2"><p className="text-caption uppercase text-content-muted">Matches</p><p className="text-lg font-medium">{filtered.length}</p></div>
            <div className="rounded-card border border-line bg-surface-2 px-4 py-2"><p className="text-caption uppercase text-content-muted">Avg. fit</p><p className="text-lg font-medium">{average}%</p></div>
            <div className="rounded-card border border-line bg-surface-2 px-4 py-2"><p className="text-caption uppercase text-content-muted">ICP</p><p className="text-sm font-medium">{icpConfigured ? 'Active' : 'Missing'}</p></div>
          </div>
        </div>
      </div>

      <div className={cn(workspacePanelClass, 'p-4')}>
        <div className="flex items-center gap-2 text-sm font-medium text-content-primary"><Filter className="h-4 w-4" />Filters</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-content-muted" /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search company, market, source" className={cn('min-h-10 w-full rounded-ctl border pl-9 pr-3 text-sm', workspaceFieldSurfaceClass)} /></label>
          <select value={type} onChange={(e) => { setType(e.target.value as typeof type); setPage(1); }} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All records</option><option value="buyer">Buyers only</option><option value="supplier">Suppliers only</option></select>
          <select value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All countries</option>{countries.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">All sources</option>{sources.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={contact} onChange={(e) => { setContact(e.target.value as typeof contact); setPage(1); }} className={cn('min-h-10 rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}><option value="all">Any contact state</option><option value="not_contacted">Not contacted</option><option value="contacted">Contacted</option></select>
          {currentUserId ? <label className="flex min-h-10 items-center gap-2 rounded-ctl border px-3 text-sm text-content-secondary"><input type="checkbox" checked={owner === 'mine'} onChange={(e) => { setOwner(e.target.checked ? 'mine' : 'all'); setPage(1); }} />My records only</label> : null}
          <label className="flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-surface-1 px-3 text-sm"><span>Min fit</span><input type="range" min="40" max="90" step="10" value={minFit} onChange={(e) => { setMinFit(Number(e.target.value)); setPage(1); }} /><strong>{minFit}%</strong></label>
        </div>
      </div>

      <div className={cn(workspacePanelClass, 'overflow-hidden')}>
        {!visible.length ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-content-muted" />
            <p className="mt-3 text-sm text-content-secondary">{icpConfigured ? 'No CRM records match the selected filters.' : 'Set up an ICP before running CRM matching.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((item) => (
              <article key={item.leadId} className="grid gap-3 p-4 lg:grid-cols-[1.3fr_.8fr_.7fr_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-medium text-content-primary">{item.label}</p>
                  <p className="mt-1 text-xs text-content-muted">{item.country || 'Country missing'} · {item.leadType} · {item.companyType || 'Type not recorded'}</p>
                </div>
                <div><p className="text-caption uppercase text-content-muted">Source</p><p className="mt-1 text-sm">{item.signalSource}</p></div>
                <div><p className="text-caption uppercase text-content-muted">Fit</p><p className="mt-1 text-sm font-medium text-success-fg">{item.fitScore.score}%</p><p className="text-[11px] text-content-muted">{item.scoreVersion}</p></div>
                <div><p className="text-caption uppercase text-content-muted">Why</p><p className="mt-1 line-clamp-2 text-xs text-content-secondary">{item.fitScore.reasons?.[0] || 'Matches the active ICP.'}</p>{item.missingData.length ? <p className="mt-1 text-[11px] text-warning-fg">Missing: {item.missingData.join(', ')}</p> : null}</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setActive(item)} className={cn('inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Review</button>
                  <Link href={`/leads/${item.leadId}`} className="inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium text-brand-700 hover:bg-surface-2">Open<ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line p-3 text-xs text-content-muted">
          <span>Showing {visible.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-ctl border border-line px-3 py-1.5 disabled:opacity-40">Previous</button>
            <span>Page {safePage} of {totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-ctl border border-line px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      <GrowthReviewDrawer open={Boolean(active)} onClose={() => setActive(null)} eyebrow="CRM Match" title={active?.label ?? ''}>
        {active ? <CrmMatchReviewPanel item={active} onClose={() => setActive(null)} /> : null}
      </GrowthReviewDrawer>
    </section>
  );
}

function CrmMatchReviewPanel({ item, onClose }: { item: OpportunityCard; onClose: () => void }) {
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'linkedin' | 'call'>('email');
  const [subject, setSubject] = useState(`Introduction — ${item.label}`);
  const [body, setBody] = useState(item.recommendedAction);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function saveDraft() {
    setStatus('saving');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/setu-guru/crm-matches/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: item.leadId, channel, subject: channel === 'email' ? subject : undefined, body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The draft could not be saved.');
      setStatus('saved');
      setSavedDraftId(payload.draft?.id ?? null);
      setSendStatus('idle');
      setSendMessage(null);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'The draft could not be saved.');
    }
  }

  async function approveAndSend() {
    if (!savedDraftId) return;
    setSendStatus('sending');
    setSendMessage(null);
    try {
      const response = await fetch('/api/setu-guru/crm-matches/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: savedDraftId, leadId: item.leadId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The draft could not be sent.');
      setSendStatus('done');
      setSendMessage(payload.queued ? 'Sent, and the record was marked contacted.' : `Approved, but not sent automatically: ${payload.reason}`);
    } catch (error) {
      setSendStatus('error');
      setSendMessage(error instanceof Error ? error.message : 'The draft could not be sent.');
    }
  }

  async function scheduleFollowUp() {
    if (!followUpDate) return;
    setFollowUpStatus('saving');
    try {
      const response = await fetch('/api/setu-guru/crm-matches/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: item.leadId, dueAt: followUpDate, note: followUpNote || undefined }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'The follow-up could not be scheduled.');
      }
      setFollowUpStatus('saved');
    } catch {
      setFollowUpStatus('error');
    }
  }

  return (
    <div className="space-y-5">
      <DrawerSection title="Company summary">
        <p>{item.country || 'Country not recorded'} · {item.leadType} · {item.companyType || 'Type not recorded'}</p>
        <p className="mt-1 text-xs text-content-muted">Source: {item.signalSource}</p>
      </DrawerSection>

      <DrawerSection title="Fit score breakdown">
        <p className="text-lg font-medium text-content-primary">{item.fitScore.score}%<span className="ml-2 text-xs font-normal text-content-muted">{item.scoreVersion}</span></p>
        {item.fitScore.reasons?.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">{item.fitScore.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}
      </DrawerSection>

      {item.missingData.length ? (
        <DrawerSection title="Missing information">
          <ul className="list-disc space-y-1 pl-4 text-xs text-warning-fg">{item.missingData.map((field) => <li key={field}>{field}</li>)}</ul>
        </DrawerSection>
      ) : null}

      <DrawerSection title="Outreach draft">
        <div className="space-y-2">
          <select value={channel} onChange={(e) => { setChannel(e.target.value as typeof channel); setSavedDraftId(null); setSendStatus('idle'); }} className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)}>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="linkedin">LinkedIn note</option>
            <option value="call">Call note</option>
          </select>
          {channel === 'email' ? <input value={subject} onChange={(e) => setSubject(e.target.value)} className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} placeholder="Subject" /> : null}
          <textarea value={body} onChange={(e) => { setBody(e.target.value); setSavedDraftId(null); setSendStatus('idle'); }} rows={5} className={cn('w-full rounded-ctl border p-3 text-sm', workspaceFieldSurfaceClass)} />
          <p className="text-[11px] text-content-muted">Saving writes a draft to the record's communication history. Approve &amp; send is a separate, explicit step.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={saveDraft} disabled={status === 'saving'} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspacePrimaryButtonClass)}><Send className="h-3.5 w-3.5" />{status === 'saving' ? 'Saving…' : 'Save draft'}</button>
            {savedDraftId ? (
              <button type="button" onClick={approveAndSend} disabled={sendStatus === 'sending' || sendStatus === 'done'} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspaceSecondaryButtonClass)}>{sendStatus === 'sending' ? 'Sending…' : 'Approve & send'}</button>
            ) : null}
            {status === 'saved' && !savedDraftId ? <span className="text-xs text-success-fg">Draft saved to the record.</span> : null}
            {status === 'error' ? <span className="text-xs text-danger-fg">{errorMessage}</span> : null}
            {sendMessage ? <span className={cn('text-xs', sendStatus === 'error' ? 'text-danger-fg' : 'text-content-secondary')} role="status" aria-live="polite">{sendMessage}</span> : null}
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Follow-up">
        <div className="space-y-2">
          <input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} />
          <input value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="Note (optional)" className={cn('min-h-9 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass)} />
          <button type="button" onClick={scheduleFollowUp} disabled={!followUpDate || followUpStatus === 'saving'} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspaceSecondaryButtonClass)}>{followUpStatus === 'saving' ? 'Scheduling…' : 'Schedule follow-up'}</button>
          {followUpStatus === 'saved' ? <span className="ml-2 text-xs text-success-fg">Scheduled — visible in the Work Queue.</span> : null}
          {followUpStatus === 'error' ? <span className="ml-2 text-xs text-danger-fg">The follow-up could not be scheduled.</span> : null}
        </div>
      </DrawerSection>

      <div className="flex justify-end border-t border-line pt-4">
        <Link href={`/leads/${item.leadId}`} onClick={onClose} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Open full record<ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </div>
  );
}
