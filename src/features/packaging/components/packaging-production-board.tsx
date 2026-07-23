'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { PRODUCTION_STAGES, nextProductionStage, productionStageLabel, type ProductionStage } from '@/lib/packaging/types';
import { advancePackagingProductionStage } from '@/features/packaging/server/actions';
import { workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

/**
 * S27-STARK-E1 — Production-stage tracker (evolves the v1 read-only
 * Dispatch Board). Each job shows its current stage and, for Design/
 * Operations/owner/admin, an "Advance" action plus a manual override
 * select for corrections. Everyone else sees the same board read-only.
 */

export type ProductionBoardItem = {
  lineId: string;
  quoteId: string;
  leadId: string | null;
  companyName: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  specSummary: string | null;
  leadTime: string | null;
  stage: ProductionStage | null;
  stageEnteredAt: string | null;
};

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function stageBadgeClass(stage: ProductionStage | null): string {
  if (!stage) return 'bg-surface-2 text-content-muted border-line';
  if (stage === 'dispatched') return 'bg-success-bg text-success-fg border-success-border';
  if (stage === 'qc' || stage === 'packed') return 'bg-info-bg text-info-fg border-info-border';
  return 'bg-warning-bg text-warning-fg border-warning-border';
}

function Row({ item, canEdit }: { item: ProductionBoardItem; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [overriding, setOverriding] = useState(false);
  const next = nextProductionStage(item.stage);
  const age = daysSince(item.stageEnteredAt);

  const advanceTo = (stage: ProductionStage) => {
    setError(null);
    startTransition(async () => {
      const response = await advancePackagingProductionStage(item.lineId, stage);
      if (!response.ok) setError(response.error ?? 'Could not update stage.');
      else setOverriding(false);
    });
  };

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-content-primary">{item.companyName ?? 'Unknown company'}</p>
          <p className="truncate text-sm text-content-secondary">{item.specSummary ?? 'Packaging line'}</p>
          <p className="text-xs text-content-muted">
            {Number(item.quantity).toLocaleString()} pcs · {money(item.unitPrice, item.currency)} / pc{item.leadTime ? ` · ${item.leadTime}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stageBadgeClass(item.stage)}`}>
            {productionStageLabel(item.stage)}{age !== null ? ` · ${age}d` : ''}
          </span>
          <Link href={`/quotes/${item.quoteId}/job-ticket`} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-sm font-semibold text-content-primary hover:border-brand-200">
            Job ticket →
          </Link>
          {item.leadId ? (
            <Link href={`/leads/${item.leadId}/quote?quoteId=${item.quoteId}`} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-sm font-semibold text-content-primary hover:border-brand-200">
              Open quote →
            </Link>
          ) : null}
          {canEdit && next ? (
            <button
              onClick={() => advanceTo(next)}
              disabled={pending}
              className={`rounded-ctl px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 ${workspacePrimaryButtonClass}`}
            >
              {pending ? 'Updating…' : `Advance to ${productionStageLabel(next)} →`}
            </button>
          ) : null}
          {canEdit ? (
            <button onClick={() => setOverriding((value) => !value)} className={`rounded-ctl px-2.5 py-1.5 text-xs font-semibold ${workspaceSecondaryButtonClass}`}>
              {overriding ? 'Cancel' : 'Set stage…'}
            </button>
          ) : null}
        </div>
      </div>
      {overriding ? (
        <div className="flex flex-wrap items-center gap-2 rounded-ctl border border-line bg-surface-2 p-2">
          <span className="text-xs font-semibold text-content-muted">Correct to:</span>
          {PRODUCTION_STAGES.map((option) => (
            <button
              key={option.key}
              onClick={() => advanceTo(option.key)}
              disabled={pending || option.key === item.stage}
              className={`rounded-ctl border px-2.5 py-1 text-xs font-semibold disabled:opacity-40 ${option.key === item.stage ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary hover:bg-surface-app'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="rounded-ctl bg-danger-bg px-2.5 py-1.5 text-xs font-medium text-danger-fg">{error}</p> : null}
    </li>
  );
}

export default function PackagingProductionBoard({ items, canEdit }: { items: ProductionBoardItem[]; canEdit: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => <Row key={item.lineId} item={item} canEdit={canEdit} />)}
    </ul>
  );
}
