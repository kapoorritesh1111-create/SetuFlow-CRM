'use client';

import { useState } from 'react';
import { ChevronDown, History, Sparkles } from 'lucide-react';
import { AuditHistoryPanel } from '@/features/setu-guru/audit-history-panel';
import { GrowthCenter as GrowthCenterRedesign } from '@/features/setu-guru/growth-center-redesign';
import { ResearchWorkspace, TradeEventWorkspace, type TradeEventSummary } from '@/features/setu-guru/growth-center-workspaces';
import { workspacePanelClass } from '@/components/ui/workspace-surfaces';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import type { SetuGuruAuditItem } from '@/lib/setu-guru/audit-history';
import { cn } from '@/lib/utils';

type Props = {
  organizationName?: string | null;
  recommendations: SetuGuruRecommendation[];
  history: SetuGuruRecommendation[];
  opportunities?: OpportunityCard[];
  icpConfigured?: boolean;
  tradeEvents?: TradeEventSummary[];
  auditItems?: SetuGuruAuditItem[];
};

export function GrowthCenter(props: Props) {
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const opportunities = props.opportunities ?? [];
  const tradeEvents = props.tradeEvents ?? [];
  const auditItems = props.auditItems ?? [];

  return (
    <>
      <GrowthCenterRedesign {...props} />

      <section className="mt-5 space-y-3" aria-label="Growth intelligence and history">
        <button
          type="button"
          onClick={() => setShowIntelligence((value) => !value)}
          aria-expanded={showIntelligence}
          className={cn(workspacePanelClass, 'flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500')}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-info-bg text-brand-700"><Sparkles className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-content-primary">Growth intelligence</span>
              <span className="mt-0.5 block text-xs text-content-muted">{opportunities.length} opportunity matches · {tradeEvents.length} trade events</span>
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-content-muted transition-transform', showIntelligence && 'rotate-180')} />
        </button>

        {showIntelligence ? (
          <div className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
            <ResearchWorkspace opportunities={opportunities} icpConfigured={Boolean(props.icpConfigured)} />
            <TradeEventWorkspace tradeEvents={tradeEvents} recommendations={props.recommendations} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowHistory((value) => !value)}
          aria-expanded={showHistory}
          className={cn(workspacePanelClass, 'flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500')}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-surface-2 text-brand-700"><History className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block text-sm font-medium text-content-primary">History and audit</span><span className="mt-0.5 block text-xs text-content-muted">{auditItems.length} recorded Setu Guru actions and approvals</span></span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-content-muted transition-transform', showHistory && 'rotate-180')} />
        </button>

        {showHistory ? <div className={cn(workspacePanelClass, 'p-4 motion-safe:animate-in motion-safe:fade-in')}><AuditHistoryPanel items={auditItems} /></div> : null}
      </section>
    </>
  );
}
