import { cn } from '@/lib/utils';
import { StatusBadge, getStatusTone } from '@/components/ui/status-badge';
import { QuickActionItem, QuickActionMenu } from '@/components/ui/quick-action-menu';

export type LeadCardProps = {
  company: string;
  contact: string;
  market: string;
  stage: string;
  nextAction: string;
  requirement?: string;
  owner?: string;
  actions?: QuickActionItem[];
  selected?: boolean;
};

export function LeadCard({
  company,
  contact,
  market,
  stage,
  nextAction,
  requirement,
  owner,
  actions = [],
  selected = false,
}: LeadCardProps) {
  return (
    <article className={cn(
      'rounded-panel border p-4 transition',
      selected ? 'border-brand-700/20 bg-white shadow-[0_14px_36px_rgba(31,72,124,0.12)]' : 'border-slate-200 bg-slate-50/90 hover:border-brand-700/15 hover:bg-white',
    )}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-950">{company}</p>
            <span className="rounded-full bg-brand-700/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">{market}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{contact}{owner ? ` · Owner: ${owner}` : ''}</p>
          {requirement ? <p className="mt-1 text-sm text-slate-500">{requirement}</p> : null}
        </div>
        <StatusBadge label={stage} tone={getStatusTone(stage)} />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Next action</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{nextAction}</p>
        </div>
        {actions.length ? <QuickActionMenu items={actions} /> : null}
      </div>
    </article>
  );
}
