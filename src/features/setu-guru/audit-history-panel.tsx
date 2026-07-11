import { AlertTriangle, CheckCircle2, Clock3, FileText, History } from 'lucide-react';

import { StatusBadge } from '@/components/ui/status-badge';
import { workspaceInsetClass, workspacePanelClass } from '@/components/ui/workspace-surfaces';
import type { SetuGuruAuditItem } from '@/lib/setu-guru/audit-history';
import { cn } from '@/lib/utils';

function toneFor(outcome: string) {
  if (['completed', 'approved'].includes(outcome)) return 'success' as const;
  if (['dismissed', 'draft'].includes(outcome)) return 'neutral' as const;
  if (outcome === 'attention required') return 'danger' as const;
  return 'warning' as const;
}

function iconFor(item: SetuGuruAuditItem) {
  if (item.outcome === 'attention required') return AlertTriangle;
  if (['completed', 'approved'].includes(item.outcome)) return CheckCircle2;
  if (item.kind === 'draft') return FileText;
  return Clock3;
}

export function AuditHistoryPanel({ items }: { items: SetuGuruAuditItem[] }) {
  return (
    <section className={cn(workspacePanelClass, 'p-5 lg:p-6')} aria-labelledby="setu-guru-audit-heading">
      <div className="flex items-start gap-3">
        <div className="rounded-card bg-surface-2 p-2.5 text-content-secondary">
          <History className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="setu-guru-audit-heading" className="text-base font-semibold text-content-primary">Setu Guru activity and approval audit</h2>
          <p className="mt-1 text-sm leading-6 text-content-secondary">
            Recommendations, AI-assisted drafts, approvals, dismissals, completed actions, actors, linked records, and missing approval evidence.
          </p>

          <div className="mt-4 space-y-3">
            {items.length ? items.map((item) => {
              const Icon = iconFor(item);
              return (
                <article key={item.id} className={cn(workspaceInsetClass, 'p-4')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold capitalize text-content-primary">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-content-secondary">{item.detail}</p>
                        {item.reason ? <p className="mt-2 text-xs leading-5 text-content-muted"><span className="font-semibold">Why:</span> {item.reason}</p> : null}
                        {item.source_context ? <p className="mt-1 text-xs leading-5 text-content-muted"><span className="font-semibold">Source context:</span> {item.source_context}</p> : null}
                        <p className="mt-2 text-xs text-content-muted">
                          {item.actor} · {item.entity_type || 'record'}{item.entity_id ? ` · ${item.entity_id}` : ''} · {new Date(item.occurred_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge label={item.outcome} tone={toneFor(item.outcome)} />
                  </div>
                </article>
              );
            }) : (
              <div className={cn(workspaceInsetClass, 'p-4')}>
                <p className="text-sm font-semibold text-content-primary">No Setu Guru audit activity yet</p>
                <p className="mt-1 text-sm text-content-secondary">Recommendations, saved drafts, approvals, dismissals, and completed actions will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
