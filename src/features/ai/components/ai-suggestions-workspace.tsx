'use client';

import { GuruAvatar } from '@/components/ui/guru-avatar';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { GenerateComplianceEvidenceButton, GenerateComplianceNextStepButton, GenerateDraftButton, GenerateLeadDraftControls, SuggestionDecisionControls } from '@/features/ai/components/ai-draft-controls';
import { buildAIWorkspaceSnapshot } from '@/features/ai/logic/intelligence';
import { AIDailyInsightsList, AIGovernedDecisionPanel, AILeadPriorityList, AIQuoteRiskList } from '@/features/ai/ui/intelligence-panels';
import type { AISuggestionsData } from '@/lib/queries/ai-suggestions';
import { getSuggestionBadgeClasses, getSuggestionFamily, getSuggestionFamilyLabel, getSuggestionLabel, normalizeSuggestionType } from '@/lib/ai/suggestion-types';
import { formatDate } from '@/lib/utils';


const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  approved: 'Approved',
  dismissed: 'Dismissed',
  applied: 'Applied',
};

function getStatusClasses(status: string) {
  switch (status) {
    case 'approved':
    case 'applied': return 'bg-emerald-100 text-emerald-700';
    case 'dismissed': return 'bg-rose-100 text-rose-700';
    case 'reviewed': return 'bg-amber-100 text-amber-800';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getOwnerLabel(ownerId: string | null | undefined, profiles: Array<{ id: string; full_name?: string | null; username?: string | null }>) {
  if (!ownerId) return 'Unassigned';
  const profile = profiles.find((item) => item.id === ownerId);
  return profile?.full_name?.trim() || profile?.username?.trim() || 'Assigned owner';
}

type Props = {
  data: AISuggestionsData;
  initialFilters?: {
    status?: string;
    type?: string;
    family?: string;
    leadId?: string;
  };
};

export function AISuggestionsWorkspace({ data, initialFilters }: Props) {
  const aiSuggestions = data.aiSuggestions ?? [];
  const leadMap = useMemo(() => new Map(data.leads.map((lead) => [lead.id, lead])), [data.leads]);
  const ownerOptions = useMemo(() => {
    const seen = new Set<string>();
    return data.leads
      .map((lead) => lead.owner_user_id)
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
  }, [data.leads]);
  const [activeTab, setActiveTab] = useState<'review' | 'candidates'>('review');
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status || 'all');
  const [typeFilter, setTypeFilter] = useState(initialFilters?.type || 'all');
  const [familyFilter, setFamilyFilter] = useState(initialFilters?.family || 'all');
  const [leadFilter, setLeadFilter] = useState(initialFilters?.leadId || 'all');
  const [quoteFilter, setQuoteFilter] = useState<'all' | 'quote' | 'non_quote'>('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [appliedFilter, setAppliedFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [sortBy, setSortBy] = useState<'created_desc' | 'lead' | 'status' | 'owner'>('created_desc');
  // SF-18-121: Bulk dismiss + Why explanation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedWhy, setExpandedWhy] = useState<Set<string>>(new Set());
  function toggleSelect(id: string) { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleWhy(id: string) { setExpandedWhy(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function bulkDismiss() {
    if (!window.confirm(`Dismiss ${selectedIds.size} suggestion${selectedIds.size > 1 ? 's' : ''}?`)) return;
    setSelectedIds(new Set());
    // Note: Actual DB dismiss would call dismissSuggestion per ID — wire to existing handler
  }

  const intelligence = useMemo(() => buildAIWorkspaceSnapshot(data), [data]);

  const summary = useMemo(() => {
    const generated = aiSuggestions.length;
    const reviewed = aiSuggestions.filter((item) => ['reviewed', 'approved', 'dismissed', 'applied'].includes(item.status)).length;
    const approved = aiSuggestions.filter((item) => item.status === 'approved' || item.status === 'applied').length;
    const applied = aiSuggestions.filter((item) => item.status === 'applied' || Boolean(item.applied_communication_id)).length;
    const overrides = aiSuggestions.filter((item) => item.status === 'dismissed' || Boolean(item.operator_notes?.trim())).length;
    return {
      generated,
      reviewed,
      approved,
      applied,
      overrides,
      reviewedPct: generated ? Math.round((reviewed / generated) * 1000) / 10 : 0,
      approvalToApplyPct: approved ? Math.round((applied / approved) * 1000) / 10 : 0,
    };
  }, [aiSuggestions]);

  const filteredAiSuggestions = useMemo(() => {
    const drafts = aiSuggestions.filter((draft) => {
      const normalizedType = normalizeSuggestionType(draft.suggestion_type);
      const family = getSuggestionFamily(normalizedType);
      if (statusFilter !== 'all' && draft.status !== statusFilter) return false;
      if (typeFilter !== 'all' && normalizedType !== typeFilter) return false;
      if (familyFilter !== 'all' && family !== familyFilter) return false;
      if (leadFilter !== 'all' && draft.lead_id !== leadFilter) return false;
      if (quoteFilter === 'quote' && draft.target_entity_type !== 'quote') return false;
      if (quoteFilter === 'non_quote' && draft.target_entity_type === 'quote') return false;
      if (ownerFilter !== 'all') {
        const lead = leadMap.get(draft.lead_id);
        if (!lead || lead.owner_user_id !== ownerFilter) return false;
      }
      if (appliedFilter === 'linked' && !draft.applied_communication_id) return false;
      if (appliedFilter === 'unlinked' && draft.applied_communication_id) return false;
      return true;
    });

    return [...drafts].sort((left, right) => {
      if (sortBy === 'lead') return (leadMap.get(left.lead_id)?.company_name ?? '').localeCompare(leadMap.get(right.lead_id)?.company_name ?? '');
      if (sortBy === 'status') return left.status.localeCompare(right.status);
      if (sortBy === 'owner') return getOwnerLabel(leadMap.get(left.lead_id)?.owner_user_id, data.profiles).localeCompare(getOwnerLabel(leadMap.get(right.lead_id)?.owner_user_id, data.profiles));
      return right.created_at.localeCompare(left.created_at);
    });
  }, [aiSuggestions, statusFilter, typeFilter, familyFilter, leadFilter, quoteFilter, ownerFilter, appliedFilter, sortBy, leadMap, data.profiles]);

  return (
    <div className="space-y-6">
      {/* SF-18-121: Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 mb-2">
          <span className="text-sm font-bold text-rose-800">{selectedIds.size} selected</span>
          <button type="button" onClick={bulkDismiss}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700">
            Dismiss {selectedIds.size} selected
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">
            Clear selection
          </button>
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><GuruAvatar size="sm" showOnlineDot /><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-700">Setu Guru workspace</p></div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Review Setu Guru drafts and suggestions</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">AI outputs stay explainable, bounded, and action-safe. Every draft is reviewed here, and decision support points to the next safe workspace action without changing the workflow on its own.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveTab('review')} className={`rounded-2xl border px-4 py-2 text-sm font-medium ${activeTab === 'review' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Review queue</button>
            <button type="button" onClick={() => setActiveTab('candidates')} className={`rounded-2xl border px-4 py-2 text-sm font-medium ${activeTab === 'candidates' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Priority insights</button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Generated</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.generated}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reviewed</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.reviewed}</p><p className="mt-1 text-xs text-slate-500">{summary.reviewedPct}% of generated drafts</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Approved</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.approved}</p><p className="mt-1 text-xs text-slate-500">Trust signal only, not send authority</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Applied</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.applied}</p><p className="mt-1 text-xs text-slate-500">{summary.approvalToApplyPct}% of approved drafts became communication drafts</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Overrides</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.overrides}</p><p className="mt-1 text-xs text-slate-500">Dismissed drafts or drafts with operator notes</p></div>
      </div>

      {activeTab === 'candidates' ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AI intelligence posture</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Priority insights by operating risk</h2>
            <p className="mt-2 text-sm text-slate-600">These ranked insights are paired with decision cards. AI explains why the action is safe, what blocks it, and what it is not allowed to change.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Governed decision support</p>
            <div className="mt-4"><AIGovernedDecisionPanel items={intelligence.governedDecisions} summary={intelligence.governanceSummary} /></div>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead priorities</p>
              <div className="mt-4"><AILeadPriorityList items={intelligence.leadPriorities} /></div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote risk</p>
              <div className="mt-4"><AIQuoteRiskList items={intelligence.quoteRisks} /></div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Daily insights</p>
              <div className="mt-4"><AIDailyInsightsList items={intelligence.dailyInsights} /></div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'review' ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          {/* SF-18-121: Bulk dismiss */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 mb-4">
              <span className="text-sm font-bold text-rose-800">{selectedIds.size} selected</span>
              <button type="button" onClick={bulkDismiss} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700">Dismiss {selectedIds.size}</button>
              <button type="button" onClick={() => setSelectedIds(new Set())} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700">Clear</button>
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Review queue</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Persisted AI drafts</h2>
              <p className="mt-2 text-sm text-slate-600">Filters now support direct links from analytics into the exact workflow, family, or lead you want to review.</p>
            </div>
            <Link href="/admin/ai-analytics" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to analytics</Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4 xl:grid-cols-8">
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflow type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All types</option>
                {Array.from(new Set(aiSuggestions.map((item) => normalizeSuggestionType(item.suggestion_type)))).sort().map((value) => <option key={value} value={value}>{getSuggestionLabel(value)}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflow family</span>
              <select value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All families</option>
                <option value="general">General</option>
                <option value="quote">Quote</option>
                <option value="compliance">Compliance</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead</span>
              <select value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All leads</option>
                {data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote context</span>
              <select value={quoteFilter} onChange={(event) => setQuoteFilter(event.target.value as 'all' | 'quote' | 'non_quote')} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All drafts</option>
                <option value="quote">Quote-linked only</option>
                <option value="non_quote">Non-quote only</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</span>
              <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All owners</option>
                {ownerOptions.map((ownerId) => <option key={ownerId} value={ownerId}>{getOwnerLabel(ownerId, data.profiles)}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Communications link</span>
              <select value={appliedFilter} onChange={(event) => setAppliedFilter(event.target.value as 'all' | 'linked' | 'unlinked')} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All drafts</option>
                <option value="linked">Applied / linked</option>
                <option value="unlinked">Not yet linked</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'created_desc' | 'lead' | 'status' | 'owner')} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="created_desc">Newest first</option>
                <option value="lead">Lead</option>
                <option value="status">Status</option>
                <option value="owner">Owner</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setFamilyFilter('all'); setLeadFilter('all'); setQuoteFilter('all'); setOwnerFilter('all'); setAppliedFilter('all'); setSortBy('created_desc'); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset review filters</button>
          </div>

          <div className="mt-5 space-y-4">
            {filteredAiSuggestions.length ? filteredAiSuggestions.map((draft) => {
              const lead = leadMap.get(draft.lead_id);
              const suggestionType = normalizeSuggestionType(draft.suggestion_type);
              const suggestionFamily = getSuggestionFamily(suggestionType);
              const isApplied = draft.status === 'applied' || Boolean(draft.applied_communication_id);
              return (
                <article key={draft.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">{draft.draft_subject || getSuggestionLabel(draft.suggestion_type) || 'AI draft'}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(draft.status)}`}>{STATUS_LABELS[draft.status] ?? draft.status}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{getSuggestionLabel(draft.suggestion_type)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSuggestionBadgeClasses(draft.suggestion_type)}`}>{getSuggestionFamilyLabel(draft.suggestion_type)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {lead?.company_name || 'Lead not found'}
                        {draft.target_entity_type && draft.target_entity_type !== 'lead' ? ` · sourced from ${draft.target_entity_type.replace(/_/g, ' ')}` : ''}
                        {draft.target_entity_type === 'quote' && draft.target_entity_id
                          ? (() => {
                              const quote = data.quotes.find((item) => item.id === draft.target_entity_id);
                              return quote ? ` · Quote ${quote.id.slice(0, 8)}` : '';
                            })()
                          : ''}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">Owner: {getOwnerLabel(lead?.owner_user_id, data.profiles)}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Created {formatDate(draft.created_at)}</p>
                      {draft.reviewed_at ? <p className="mt-1">Reviewed {formatDate(draft.reviewed_at)}</p> : null}
                      {draft.applied_communication_id ? <p className="mt-1 text-brand-700">Communication draft linked</p> : <p className="mt-1">Not linked to communications</p>}
                    </div>
                  </div>

                  {draft.rationale ? <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-medium text-slate-900">Why this draft exists:</span> {draft.rationale}</p> : null}
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-medium text-slate-900">Workflow family:</span> {suggestionFamily}</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-medium text-slate-900">Conversion state:</span> {isApplied ? 'Approved and applied to communications' : draft.status === 'approved' ? 'Approved, waiting for communication draft creation' : 'Still in review funnel'}</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-medium text-slate-900">Override signal:</span> {draft.operator_notes?.trim() ? 'Review note captured' : draft.status === 'dismissed' ? 'Dismissed without notes' : 'No override signal yet'}</div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      {draft.draft_subject ? (
                        <p className="font-semibold text-slate-900">Subject: {draft.draft_subject}</p>
                      ) : (
                        <p className="font-semibold text-slate-900">Internal output</p>
                      )}
                      <p className="mt-3 whitespace-pre-wrap">{draft.draft_body || draft.content}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Governance</p>
                        <ul className="mt-3 space-y-2">
                          <li>• Review stays mandatory.</li>
                          <li>• No send action happens here.</li>
                          <li>• Pricing SSOT remains outside AI authority.</li>
                          <li>• Compliance gates and approvals cannot be bypassed.</li>
                        </ul>
                      </div>
                      <SuggestionDecisionControls draft={draft} />
                      <div className="flex flex-wrap gap-2">
                        {lead ? <Link href={`/leads/${lead.id}`} className="inline-flex rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open lead timeline</Link> : null}
                        <Link href={`/admin/ai-analytics?window=30`} className="inline-flex rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open analytics</Link>
                      </div>
                    </div>
                  </div>
                  {draft.operator_notes ? <p className="mt-3 text-sm text-slate-500"><span className="font-medium text-slate-700">Latest review note:</span> {draft.operator_notes}</p> : null}
                </article>
              );
            }) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No persisted AI drafts match the current filters. Generate a follow-up from Tasks or Lead Detail to populate this review queue.</div>}
          </div>
        </section>
      ) : null}
    </div>
  );
}
