'use client';

import { FilterBar, FilterSearch, FilterSelect, ClearAllButton, FilterMeta } from '@/components/ui/premium-filter-bar';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ContractsWorkspaceData } from '@/lib/queries/contracts';
import { formatDate } from '@/lib/utils';
import { getCommercialLockStateLabel, parseContractCommercialSnapshot, parseContractLineContinuitySnapshot } from '@/lib/contract-lock';
import { progressContract, updateContractWorkspaceDetails, type ContractActionState } from '@/features/contracts/server/actions';

const CONTRACT_PAGE_SIZE = 25;

function isOpenStatus(status: string | null | undefined) {
  const value = String(status ?? '').toLowerCase();
  return !['signed', 'active', 'closed', 'expired', 'cancelled', 'canceled', 'terminated', 'completed'].includes(value);
}

function nextContractStatuses(status: string | null | undefined) {
  const value = String(status ?? 'draft').toLowerCase();
  if (value === 'draft') return ['signed', 'cancelled'];
  if (value === 'signed') return ['active', 'cancelled'];
  if (value === 'active') return ['completed', 'cancelled'];
  if (value === 'completed' || value === 'cancelled') return ['active'];
  return [];
}

function buildLeadHref(leadId: string | null | undefined) {
  return leadId ? `/leads/${leadId}/quote?returnTo=/contracts` : '/leads';
}

function buildQuoteHref(leadId: string | null | undefined, quoteId: string | null | undefined) {
  if (!leadId) return '/quotes';
  const query = new URLSearchParams({ returnTo: '/contracts' });
  if (quoteId) query.set('quoteId', quoteId);
  return `/leads/${leadId}/quote?${query.toString()}`;
}

function getAuditLabel(action: string | null | undefined) {
  const value = String(action ?? '').trim();
  if (!value) return 'Contract audit event';
  return value.replace(/_/g, ' ');
}

function StateMessage({ title, description, tone = 'neutral' }: { title: string; description: string; tone?: 'neutral' | 'warning' | 'danger' }) {
  const classes = tone === 'danger'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${classes}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{description}</p>
    </div>
  );
}

function ContractStatusAction({
  contractId,
  nextStatus,
  canProgressContracts,
  readOnlyMessage,
  missingLinkedContext,
}: {
  contractId: string;
  nextStatus: string;
  canProgressContracts: boolean;
  readOnlyMessage: string | null;
  missingLinkedContext: boolean;
}) {
  const [state, formAction] = useFormState(progressContract, {} as ContractActionState);
  const blockedMessage = missingLinkedContext
    ? 'Resolve the missing linked lead or quote before moving this contract forward.'
    : !canProgressContracts
      ? (readOnlyMessage ?? 'Your current role can inspect this contract but cannot progress contract status.')
      : null;

  return (
    <form action={formAction} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
      <input type="hidden" name="contract_id" value={contractId} />
      <input type="hidden" name="next_status" value={nextStatus} />
      <textarea
        name="notes"
        rows={2}
        placeholder={`Add context for ${nextStatus}`}
        disabled={!canProgressContracts || missingLinkedContext}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-300 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
      <button type="submit" disabled={!canProgressContracts || missingLinkedContext} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
        Mark {nextStatus}
      </button>
      {blockedMessage ? <p className="text-xs text-amber-700">{blockedMessage}</p> : null}
      {state?.error ? <p className="text-xs text-rose-600">Contract progression failed: {state.error}</p> : null}
      {state?.success ? <p className="text-xs text-emerald-600">{state.success}</p> : null}
    </form>
  );
}

function ContractWorkspaceEditor({
  contractId,
  startsOn,
  endsOn,
  notes,
  canManageContracts,
  readOnlyMessage,
  missingLinkedContext,
}: {
  contractId: string;
  startsOn?: string | null;
  endsOn?: string | null;
  notes?: string | null;
  canManageContracts: boolean;
  readOnlyMessage: string | null;
  missingLinkedContext: boolean;
}) {
  const [state, formAction] = useFormState(updateContractWorkspaceDetails, {} as ContractActionState);
  const blockedMessage = missingLinkedContext
    ? 'Resolve the missing linked lead or quote before editing contract workspace details.'
    : !canManageContracts
      ? (readOnlyMessage ?? 'Read-only contract workspace')
      : null;

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="contract_id" value={contractId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Start date
          <input type="date" name="starts_on" defaultValue={startsOn ?? ''} disabled={!canManageContracts || missingLinkedContext} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-300 disabled:cursor-not-allowed disabled:bg-slate-100" />
        </label>
        <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">End date
          <input type="date" name="ends_on" defaultValue={endsOn ?? ''} disabled={!canManageContracts || missingLinkedContext} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-300 disabled:cursor-not-allowed disabled:bg-slate-100" />
        </label>
      </div>
      <label className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Workspace notes
        <textarea name="notes" defaultValue={notes ?? ''} rows={3} disabled={!canManageContracts || missingLinkedContext} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-300 disabled:cursor-not-allowed disabled:bg-slate-100" placeholder="Add delivery, signature, or commercial context" />
      </label>
      <button type="submit" disabled={!canManageContracts || missingLinkedContext} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">Save workspace details</button>
      {blockedMessage ? <p className="text-xs text-amber-700">{blockedMessage}</p> : null}
      {state?.error ? <p className="text-xs text-rose-600">Contract workspace update failed: {state.error}</p> : null}
      {state?.success ? <p className="text-xs text-emerald-600">{state.success}</p> : null}
    </form>
  );
}

export function ContractsWorkspace({
  data,
  canManageContracts,
  canProgressContracts,
  readOnlyMessage,
  progressReadOnlyMessage,
}: {
  data: ContractsWorkspaceData;
  canManageContracts: boolean;
  canProgressContracts: boolean;
  readOnlyMessage: string | null;
  progressReadOnlyMessage: string | null;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const leadMap = useMemo(() => new Map(data.leads.map((lead) => [lead.id, lead])), [data.leads]);
  const quoteMap = useMemo(() => new Map(data.quotes.map((quote) => [quote.id, quote])), [data.quotes]);
  const documentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.documents.forEach((doc) => counts.set(doc.related_id ?? '', (counts.get(doc.related_id ?? '') ?? 0) + 1));
    return counts;
  }, [data.documents]);
  const lineItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.contractLineItems.forEach((item) => counts.set(item.contract_id, (counts.get(item.contract_id) ?? 0) + 1));
    return counts;
  }, [data.contractLineItems]);
  const complianceByLead = useMemo(() => {
    const counts = new Map<string, number>();
    data.complianceItems.filter((item) => isOpenStatus(item.status)).forEach((item) => counts.set(item.lead_id ?? '', (counts.get(item.lead_id ?? '') ?? 0) + 1));
    return counts;
  }, [data.complianceItems]);
  const communicationsByQuote = useMemo(() => {
    const grouped = new Map<string, typeof data.communications>();
    data.communications.forEach((item) => {
      const key = item.quote_id ?? item.related_id ?? '';
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });
    return grouped;
  }, [data.communications]);
  const negotiationsByQuote = useMemo(() => {
    const grouped = new Map<string, typeof data.negotiationEvents>();
    data.negotiationEvents.forEach((item) => grouped.set(item.quote_id, [...(grouped.get(item.quote_id) ?? []), item]));
    return grouped;
  }, [data.negotiationEvents]);

  const linkedContextMissingCount = useMemo(
    () => data.contracts.filter((contract) => !leadMap.get(contract.lead_id) || !quoteMap.get(contract.quote_id)).length,
    [data.contracts, leadMap, quoteMap],
  );
  const contractsWithBlockers = useMemo(
    () => data.contracts.filter((contract) => (complianceByLead.get(contract.lead_id) ?? 0) > 0).length,
    [data.contracts, complianceByLead],
  );
  const activeContracts = useMemo(
    () => data.contracts.filter((contract) => !['completed', 'cancelled'].includes(String(contract.status ?? '').toLowerCase())).length,
    [data.contracts],
  );
  const statusOptions = useMemo(() => Array.from(new Set(data.contracts.map((contract) => String(contract.status ?? 'Unknown')))).sort(), [data.contracts]);
  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.contracts.filter((contract) => {
      const lead = leadMap.get(contract.lead_id);
      const quote = quoteMap.get(contract.quote_id);
      const searchable = [lead?.company_name, contract.id, contract.quote_id, contract.status, quote?.status].join(' ').toLowerCase();
      const changedAt = Date.parse(contract.signed_at ?? contract.updated_at ?? '');
      const days = dateFilter === '30' ? 30 : dateFilter === '90' ? 90 : null;
      return (!query || searchable.includes(query)) && (statusFilter === 'all' || String(contract.status ?? 'Unknown') === statusFilter) && (!days || (Number.isFinite(changedAt) && changedAt >= Date.now() - days * 86400000));
    });
  }, [data.contracts, dateFilter, leadMap, quoteMap, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredContracts.length / CONTRACT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * CONTRACT_PAGE_SIZE, currentPage * CONTRACT_PAGE_SIZE);
  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setDateFilter('all'); setPage(1); };

  if (!data.contracts.length) {
    return <EmptyState title="No contracts yet" description="Signed quotes and commercial commitments will appear here once the contracts table starts receiving live records." actionHref="/leads" actionLabel="Return to leads" />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-panel border border-slate-200 bg-white p-4 shadow-soft xl:grid-cols-[0.9fr_1.1fr_auto]">
        <div className="rounded-card border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Where am I</p>
          <p className="mt-2 text-base font-semibold text-slate-900">Contract progression desk</p>
          <p className="mt-1 text-sm text-slate-600">Track signed commitments and only open full detail when the blocker or status actually needs action.</p>
        </div>
        <div className="rounded-card border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">What is blocking me</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{linkedContextMissingCount > 0 ? `${linkedContextMissingCount} missing linked records` : contractsWithBlockers > 0 ? `${contractsWithBlockers} compliance-blocked contracts` : 'No contract blockers right now'}</p>
          <p className="mt-1 text-sm text-slate-600">Progress contracts only after linked quote context and compliance are both clean.</p>
        </div>
        <div className="flex flex-col gap-2 xl:min-w-[220px]">
          <Link href="/documents" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open documents</Link>
          <Link href="/admin/audit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Open contract audit</Link>
        </div>
      </section>
      {!canManageContracts ? <StateMessage title="Read-only contract workspace" description={readOnlyMessage ?? 'Your current role can inspect contract health, but only lead-manage roles can edit workspace details.'} tone="warning" /> : null}
      {!canProgressContracts ? <StateMessage title="Contract status progression is limited" description={progressReadOnlyMessage ?? 'Your current role can inspect the contract, but only quote-send roles can progress contract status.'} tone="warning" /> : null}
      {linkedContextMissingCount > 0 ? <StateMessage title="Missing linked context is blocking contracts" description={`${linkedContextMissingCount} contract${linkedContextMissingCount === 1 ? '' : 's'} cannot safely progress because the linked lead or quote context is missing from the workspace snapshot.`} tone="danger" /> : null}
      {contractsWithBlockers > 0 ? <StateMessage title="Compliance blockers still affect contract progression" description={`${contractsWithBlockers} contract${contractsWithBlockers === 1 ? '' : 's'} still have open compliance blockers tied to the linked lead. Resolve them before progressing contract status.`} tone="warning" /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Contracts</p><p className="mt-2 text-3xl font-semibold text-slate-900">{data.contracts.length}</p></div>
        <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Active contracts</p><p className="mt-2 text-3xl font-semibold text-slate-900">{activeContracts}</p></div>
        <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Open blockers</p><p className="mt-2 text-3xl font-semibold text-slate-900">{contractsWithBlockers}</p></div>
        <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Missing context</p><p className="mt-2 text-3xl font-semibold text-slate-900">{linkedContextMissingCount}</p></div>
      </div>

      <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft">
        <FilterBar className="px-0 border-0 bg-transparent">
          <FilterSearch value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Company, quote, status..." minWidth={240} />
          <FilterSelect icon="⚡" label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} active={statusFilter !== 'all'}>
            <option value="all">All statuses ▾</option>
            {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
          </FilterSelect>
          <FilterSelect icon="📅" label="Updated" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} active={dateFilter !== 'all'}>
            <option value="all">All time ▾</option>
            <option value="30">Last 30 days ▾</option>
            <option value="90">Last 90 days ▾</option>
          </FilterSelect>
          {(search || statusFilter !== 'all' || dateFilter !== 'all') && <ClearAllButton onClick={resetFilters} />}
          <FilterMeta>{filteredContracts.length} of {data.contracts.length} contracts</FilterMeta>
        </FilterBar>
        <p className="mt-3 text-sm text-slate-600">Showing {paginatedContracts.length} of {filteredContracts.length} matching contracts.</p>
      </div>

      <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recent audit events</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Audit visibility</h3>
            <p className="mt-2 text-sm text-slate-600">Review the latest contract, compliance, and document changes without leaving the contracts surface.</p>
          </div>
          <Link href="/admin/audit" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open full audit</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {data.auditEvents.slice(0, 6).map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{getAuditLabel(event.event_type)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)}</p>
              <p className="mt-2 text-xs text-slate-600">{event.entity_type || 'contract'} · {event.entity_id?.slice(0, 8) ?? 'n/a'}</p>
            </div>
          ))}
          {!data.auditEvents.length ? <p className="text-sm text-slate-500">No recent contract-side audit events yet.</p> : null}
        </div>
      </div>

      {!paginatedContracts.length ? <EmptyState title="No contracts match these filters" description="Clear search, status, or date filters to return to the full contract list." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {paginatedContracts.map((contract) => {
          const lead = leadMap.get(contract.lead_id);
          const quote = quoteMap.get(contract.quote_id);
          const blockers = complianceByLead.get(contract.lead_id) ?? 0;
          const contractCommunications = (communicationsByQuote.get(contract.quote_id) ?? []).slice(0, 3);
          const negotiationEvents = (negotiationsByQuote.get(contract.quote_id) ?? []).slice(0, 4);
          const nextStatuses = nextContractStatuses(contract.status);
          const missingLinkedContext = !lead || !quote;
          const commercialSnapshot = parseContractCommercialSnapshot((contract as any).commercial_snapshot);
          const contractLines = data.contractLineItems.filter((item) => item.contract_id === contract.id);
          const contractOverrideCount = contractLines.filter((item) => item.is_price_overridden).length;
          return (
            <article key={contract.id} className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Contract workspace</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{lead?.company_name ?? 'Linked contract'}</h3>
                  <p className="mt-2 text-sm text-slate-600">Quote {contract.quote_id.slice(0, 8)} · {quote?.status ?? 'Linked quote missing from workspace context'}</p>
                </div>
                <StatusBadge label={contract.status} tone={blockers || missingLinkedContext ? 'warning' : 'info'} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Line items</p><p className="mt-2 text-lg font-semibold text-slate-900">{lineItemCounts.get(contract.id) ?? 0}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Contract files</p><p className="mt-2 text-lg font-semibold text-slate-900">{documentCounts.get(contract.id) ?? 0}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Open compliance</p><p className="mt-2 text-lg font-semibold text-slate-900">{blockers}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Signed / updated</p><p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(contract.signed_at ?? contract.updated_at)}</p></div>
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Approved commercial lock</p>
                  <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">{getCommercialLockStateLabel((contract as any).commercial_lock_state ?? commercialSnapshot.lockState)}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pricing basis / currency</p><p className="mt-2 font-semibold text-slate-900">{(contract as any).pricing_basis ?? commercialSnapshot.pricingBasis ?? 'Not set'} · {(contract as any).quote_currency ?? commercialSnapshot.quoteCurrency ?? quote?.currency ?? 'n/a'}</p></div>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Approval posture</p><p className="mt-2 font-semibold text-slate-900">{(contract as any).approval_required ? `Required · ${(contract as any).approval_state}` : 'No approval gate'}</p><p className="mt-1 text-xs text-slate-500">{commercialSnapshot.approvedAt ? `Approved ${formatDate(commercialSnapshot.approvedAt)}` : 'Approval timestamp will appear once the gate clears.'}</p></div>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Locked commercial lines</p><p className="mt-2 font-semibold text-slate-900">{commercialSnapshot.lineCount ?? contractLines.length} lines · {commercialSnapshot.overrideCount ?? contractOverrideCount} overrides</p><p className="mt-1 text-xs text-slate-500">{commercialSnapshot.snapshotMode === 'version_bound' ? 'Accepted terms are locked to the approved quote version that was accepted.' : 'This contract is still using quote notes and quote line items as its fallback source.'}</p></div>
                </div>
              </div>
              {missingLinkedContext ? <div className="mt-4"><StateMessage title="Missing linked lead or quote context" description="This contract is loaded, but the linked lead or quote is missing from the workspace snapshot. Progression and workspace edits stay disabled until the link is restored." tone="danger" /></div> : null}
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Negotiation timeline</p>
                  <div className="mt-3 space-y-2">
                    {negotiationEvents.length ? negotiationEvents.map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">{String(event.event_type || 'event').replace(/_/g, ' ')}</p>
                        <p className="mt-1 text-xs text-slate-500">{event.actor_name || event.actor_type || 'system'} · {formatDate(event.created_at)}</p>
                        {event.message ? <p className="mt-2 text-xs text-slate-600">{event.message}</p> : null}
                      </div>
                    )) : <p className="text-sm text-slate-500">No negotiation events yet.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Operational actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={buildLeadHref(lead?.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open lead</Link>
                    <Link href={buildQuoteHref(lead?.id, contract.quote_id)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open quote</Link>
                    <Link href={lead?.id ? `/documents?returnTo=/contracts&leadId=${lead.id}` : '/documents'} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Documents</Link>
                    <Link href={lead?.id ? `/compliance?returnTo=/contracts&leadId=${lead.id}` : '/compliance'} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">Compliance</Link>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Keep contract and document context linked here: use the quote page for quote changes, then return with <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">returnTo=/contracts</code> preserved. Source: <strong>{commercialSnapshot.sourceHandoffLabel ?? 'Quote-level contract snapshot'}</strong>.</div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Contract-grade continuity snapshot</p>
                    <div className="mt-3 space-y-2">
                      {contractLines.length ? contractLines.slice(0, 4).map((line) => {
                        const continuity = parseContractLineContinuitySnapshot((line as any).continuity_snapshot);
                        return (
                          <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <p className="font-medium text-slate-900">{continuity.productVariantId ? `Variant ${String(continuity.productVariantId).slice(0, 8)}` : `Product line ${line.id.slice(0, 8)}`}</p>
                            <p className="mt-1 text-xs text-slate-500">{continuity.sourceMode === 'version_bound' ? `Accepted version line ${continuity.quoteVersionLineItemId ? continuity.quoteVersionLineItemId.slice(0, 8) : 'n/a'}` : `Quote line ${continuity.quoteLineItemId ? continuity.quoteLineItemId.slice(0, 8) : 'n/a'}`} · Qty {continuity.quantity ?? line.quantity} · Final {continuity.finalUnitPrice ?? line.unit_price ?? 'n/a'} {continuity.currency ?? line.currency ?? ''}</p>
                            <p className="mt-1 text-xs text-slate-500">Catalog {continuity.catalogPriceAmount ?? (line as any).catalog_price_amount ?? 'n/a'} {continuity.catalogPriceCurrency ?? (line as any).catalog_price_currency ?? ''}{continuity.isPriceOverridden ? ` · Override: ${continuity.overrideReason ?? 'reason captured'}` : ''}</p>
                            <p className="mt-1 text-[11px] text-slate-400">{continuity.sourceMode === 'version_bound' ? 'Locked to accepted quote version' : 'Using quote-level fallback'}</p>
                          </div>
                        );
                      }) : <p className="text-sm text-slate-500">Accepted quote lines will appear here once the contract sync is active.</p>}
                    </div>
                  </div>
                  <div className="mt-4">
                    <ContractWorkspaceEditor contractId={contract.id} startsOn={contract.starts_on} endsOn={contract.ends_on} notes={contract.notes} canManageContracts={canManageContracts} readOnlyMessage={readOnlyMessage} missingLinkedContext={missingLinkedContext} />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {nextStatuses.map((status) => <ContractStatusAction key={status} contractId={contract.id} nextStatus={status} canProgressContracts={canProgressContracts} readOnlyMessage={progressReadOnlyMessage} missingLinkedContext={missingLinkedContext} />)}
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recent contract communications</p>
                    {contractCommunications.length ? contractCommunications.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">{item.subject || item.summary || 'Contract communication'}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.status || 'sent'} · {formatDate(item.sent_at ?? item.created_at)}</p>
                      </div>
                    )) : <p className="text-sm text-slate-500">No contract-side communications yet.</p>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {pageCount > 1 ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><span>Page {currentPage} of {pageCount}</span><div className="flex gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400">Previous</button><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400">Next</button></div></div> : null}
    </div>
  );
}
