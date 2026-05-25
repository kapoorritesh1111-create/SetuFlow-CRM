'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { StateMessage } from '@/components/ui/state-message';
import { bulkWaiveComplianceWorkflow } from '@/features/compliance/server/bulk-actions';
import type { ComplianceWorkspaceData } from '@/lib/queries/compliance';
import { formatDate } from '@/lib/utils';

type ActionState = { error?: string; success?: string };

type BulkWaiveCompliancePanelProps = {
  data: ComplianceWorkspaceData;
  canReview: boolean;
  readOnlyMessage?: string | null;
};

const INITIAL_ACTION_STATE = {} as ActionState;
const CLOSED_STATUSES = new Set(['approved', 'waived', 'complete', 'completed']);

function titleCase(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Not set';
  return raw.split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function BulkWaiveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Waiving...' : 'Bulk waive selected'}
    </button>
  );
}

export function BulkWaiveCompliancePanel({ data, canReview, readOnlyMessage = null }: BulkWaiveCompliancePanelProps) {
  const [state, formAction] = useFormState(bulkWaiveComplianceWorkflow, INITIAL_ACTION_STATE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const definitionsById = useMemo(() => new Map(data.complianceDefinitions.map((item) => [item.id, item])), [data.complianceDefinitions]);
  const leadsById = useMemo(() => new Map(data.leads.map((lead) => [lead.id, lead])), [data.leads]);
  const openItems = useMemo(
    () => data.complianceItems
      .filter((item) => !CLOSED_STATUSES.has(String(item.status ?? '').toLowerCase()))
      .slice(0, 25),
    [data.complianceItems],
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const selectAll = () => setSelectedIds(openItems.map((item) => item.id));
  const clearSelection = () => setSelectedIds([]);
  const blockedMessage = !canReview ? (readOnlyMessage ?? 'Only compliance reviewers can waive requirements in bulk.') : null;

  if (!openItems.length) return null;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Reviewer bulk action</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Bulk waive compliance requirements</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Select multiple open compliance requirements and record one waiver reason. Each selected requirement is still processed individually through the compliance workflow transaction and audit trail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={selectAll} disabled={!canReview} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Select visible</button>
          <button type="button" onClick={clearSelection} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Clear</button>
        </div>
      </div>

      {blockedMessage ? <StateMessage className="mt-4" tone="warning" title="Bulk waive unavailable" description={blockedMessage} /> : null}
      {state?.error ? <StateMessage className="mt-4" tone="danger" title="Bulk waive failed" description={state.error} /> : null}
      {state?.success ? <StateMessage className="mt-4" tone="success" title="Bulk waive complete" description={state.success} /> : null}

      <form action={formAction} className="mt-4 space-y-4">
        {selectedIds.map((id) => <input key={id} type="hidden" name="compliance_id" value={id} />)}
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {openItems.map((item) => {
            const definition = definitionsById.get(item.compliance_item_id);
            const lead = leadsById.get(item.lead_id);
            const checked = selectedIds.includes(item.id);
            return (
              <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${checked ? 'border-brand-200 bg-brand-50/70' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!canReview}
                  onChange={() => toggleSelected(item.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{definition?.code ?? 'Compliance item'}{definition?.description ? ` · ${definition.description}` : ''}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {lead?.company_name ?? 'Lead not found'} · {titleCase(item.status)}{item.due_at ? ` · Due ${formatDate(item.due_at)}` : ''}
                  </span>
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{titleCase(item.severity)}</span>
              </label>
            );
          })}
        </div>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Waiver reason for selected requirements
          <textarea
            name="review_notes"
            required
            minLength={8}
            disabled={!canReview || selectedIds.length === 0}
            placeholder="Explain why these requirements can be waived. This reason is written to each selected compliance workflow entry."
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-600">{selectedIds.length} selected</p>
          <BulkWaiveButton disabled={!canReview || selectedIds.length === 0} />
        </div>
      </form>
    </section>
  );
}
