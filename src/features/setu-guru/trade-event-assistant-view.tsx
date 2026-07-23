import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { workspaceHeroClass, workspaceInsetClass, workspacePanelClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import type { TradeEventAssistant } from '@/lib/setu-guru/trade-event-assistant';
import { cn } from '@/lib/utils';

const PHASE_LABEL: Record<TradeEventAssistant['phase'], string> = {
  pre_show: 'Before the event',
  during_show: 'During the event',
  post_show: 'After the event',
};

function LeadList({ title, items, emptyLabel }: { title: string; items: TradeEventAssistant['preShowPriorityList']; emptyLabel: string }) {
  return (
    <div className={cn(workspacePanelClass, 'p-5 lg:p-6')}>
      <h2 className="text-base font-semibold text-content-primary">{title}</h2>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <Link key={item.leadId} href={`/leads/${item.leadId}`} className={cn(workspaceInsetClass, 'flex items-center justify-between gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-card')}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-content-primary">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-content-muted">{item.reason}</p>
              </div>
              {item.fitScore !== null ? <StatusBadge label={`Fit ${item.fitScore}`} tone={item.fitScore >= 65 ? 'success' : 'info'} /> : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-content-secondary">{emptyLabel}</p>
      )}
    </div>
  );
}

export function TradeEventAssistantView({ assistant }: { assistant: TradeEventAssistant }) {
  return (
    <main className="space-y-5 pb-10">
      <section className={workspaceHeroClass}>
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-start gap-4">
            <GuruAvatar size="lg" />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-accent-700">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Setu Guru · {PHASE_LABEL[assistant.phase]}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">{assistant.eventName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">{assistant.summary}</p>
            </div>
          </div>
          <Link
            href="/trade-events"
            className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}
          >
            Back to Trade Events
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className={cn(workspaceInsetClass, 'p-5')}>
          <p className="text-2xl font-bold text-content-primary">{assistant.totalLeads}</p>
          <p className="mt-1 text-caption uppercase text-content-muted">Leads captured</p>
        </div>
        <div className={cn(workspaceInsetClass, 'p-5')}>
          <p className="text-2xl font-bold text-content-primary">{assistant.hotLeadCount}</p>
          <p className="mt-1 text-caption uppercase text-content-muted">Strong ICP fit</p>
        </div>
        <div className={cn(workspaceInsetClass, 'p-5')}>
          <p className="text-2xl font-bold text-content-primary">{assistant.followUpsDue}</p>
          <p className="mt-1 text-caption uppercase text-content-muted">Follow-ups due</p>
        </div>
      </section>

      <LeadList
        title="Pre-show priority list"
        items={assistant.preShowPriorityList}
        emptyLabel="No leads captured for this event yet."
      />

      <LeadList
        title="Post-show follow-up queue"
        items={assistant.postShowFollowUpQueue}
        emptyLabel="No leads from this event currently need a follow-up action."
      />
    </main>
  );
}
