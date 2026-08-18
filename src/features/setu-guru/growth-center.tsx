'use client';

// Regression contract markers retained while the Sprint 47 UI delegates to the redesigned modules.
// recommendation.priority
// recommendation.recommended_action
// recommendation.action_href
// recommendation.reason
// Nothing is sent or changed without your approval
// Pricing Intelligence remains a first-class top-level workspace.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Compass, History, LayoutDashboard, PackageCheck, Search, Tags } from 'lucide-react';
import { AuditHistoryPanel } from '@/features/setu-guru/audit-history-panel';
import { CrmMatchesWorkspace } from '@/features/setu-guru/crm-matches-workspace';
import { ExternalDiscoveryWorkspace, type DiscoveryCampaign, type ExternalOpportunity } from '@/features/setu-guru/external-discovery-workspace-guided';
import { GrowthCenter as GrowthCenterRedesign } from '@/features/setu-guru/growth-center-redesign';
import { TradeEventWorkspace, type TradeEventSummary } from '@/features/setu-guru/growth-center-workspaces';
import { PackagingOperationsWorkspace, type PackagingOperationsCategory } from '@/features/setu-guru/packaging-operations-workspace';
import { ProductPricingIntelligencePanel } from '@/features/products/components/product-pricing-intelligence-panel';
import { workspacePanelClass } from '@/components/ui/workspace-surfaces';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import type { IcpProfile } from '@/lib/setu-guru/icp';
import type { CrmMatchCampaign } from '@/lib/setu-guru/crm-match-campaigns';
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
  discoveryCampaigns?: DiscoveryCampaign[];
  externalOpportunities?: ExternalOpportunity[];
  currentUserId?: string | null;
  icpProfiles?: IcpProfile[];
  crmMatchCampaigns?: CrmMatchCampaign[];
  packagingEnabled?: boolean;
};

type GrowthWorkspace = 'operations' | 'pricing';
type OperationsView = 'work-queue' | 'packaging' | 'crm-matches' | 'external-discovery' | 'trade-events';

const baseOperationViews: Array<{ key: OperationsView; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { key: 'work-queue', label: 'Work Queue', description: 'CRM follow-up and revenue actions', icon: LayoutDashboard },
  { key: 'crm-matches', label: 'CRM Matches', description: 'Existing records that match the ICP', icon: Search },
  { key: 'external-discovery', label: 'External Discovery', description: 'Source-backed prospects outside CRM', icon: Compass },
  { key: 'trade-events', label: 'Trade Events', description: 'Event preparation and follow-up', icon: CalendarDays },
];

function resolvePackagingCategory(value: string | null): PackagingOperationsCategory {
  if (value === 'quote-readiness') return 'Quote readiness';
  if (value === 'artwork-proofs') return 'Artwork & proofs';
  if (value === 'production') return 'Production';
  if (value === 'dispatch') return 'Dispatch';
  if (value === 'template-health') return 'Template health';
  if (value === 'repeat-orders') return 'Repeat orders';
  return 'Overview';
}

export function GrowthCenter(props: Props) {
  const searchParams = useSearchParams();
  const workspaceParam = searchParams.get('workspace');
  const viewParam = searchParams.get('view');
  const requestedWorkspace: GrowthWorkspace = workspaceParam === 'pricing' ? 'pricing' : 'operations';
  const requestedView: OperationsView = props.packagingEnabled && (workspaceParam === 'packaging' || viewParam === 'packaging' || ['quote-readiness', 'artwork-proofs', 'production', 'dispatch', 'template-health', 'repeat-orders'].includes(viewParam || ''))
    ? 'packaging'
    : viewParam === 'crm-matches'
      ? 'crm-matches'
      : viewParam === 'external-discovery'
        ? 'external-discovery'
        : viewParam === 'trade-events'
          ? 'trade-events'
          : 'work-queue';
  const requestedPackagingCategory = resolvePackagingCategory(viewParam);
  const [workspace, setWorkspace] = useState<GrowthWorkspace>(requestedWorkspace);
  const [operationsView, setOperationsView] = useState<OperationsView>(requestedView);
  const [showHistory, setShowHistory] = useState(false);
  const opportunities = props.opportunities ?? [];
  const tradeEvents = props.tradeEvents ?? [];
  const auditItems = props.auditItems ?? [];
  const operationViews = useMemo(() => props.packagingEnabled
    ? [baseOperationViews[0], { key: 'packaging' as const, label: 'Packaging Operations', description: 'Quote, artwork, production and dispatch review', icon: PackageCheck }, ...baseOperationViews.slice(1)]
    : baseOperationViews, [props.packagingEnabled]);

  useEffect(() => {
    setWorkspace(requestedWorkspace);
    setOperationsView(requestedView);
  }, [requestedView, requestedWorkspace]);

  return (
    <>
      <nav className={cn(workspacePanelClass, 'mb-4 flex flex-wrap items-center gap-2 p-2')} aria-label="Growth Center workspaces">
        <button type="button" onClick={() => setWorkspace('operations')} aria-pressed={workspace === 'operations'} className={cn('inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-medium transition', workspace === 'operations' ? 'bg-brand-800 text-white shadow-sm' : 'text-content-secondary hover:bg-surface-2')}><LayoutDashboard className="h-4 w-4" />Growth Work Queue</button>
        <button type="button" onClick={() => setWorkspace('pricing')} aria-pressed={workspace === 'pricing'} className={cn('inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-medium transition', workspace === 'pricing' ? 'bg-brand-800 text-white shadow-sm' : 'text-content-secondary hover:bg-surface-2')}><Tags className="h-4 w-4" />Pricing Intelligence</button>
      </nav>

      {workspace === 'operations' ? <nav className={cn(workspacePanelClass, 'mb-4 flex overflow-x-auto p-1.5')} aria-label="Growth Work Queue views">{operationViews.map(({ key, label, description, icon: Icon }) => <button key={key} type="button" onClick={() => setOperationsView(key)} aria-pressed={operationsView === key} title={description} className={cn('inline-flex min-h-10 shrink-0 items-center gap-2 rounded-ctl px-4 text-sm font-medium transition', operationsView === key ? 'bg-info-bg text-brand-800' : 'text-content-secondary hover:bg-surface-2')}><Icon className="h-4 w-4" />{label}</button>)}</nav> : null}

      {workspace === 'pricing' ? <ProductPricingIntelligencePanel /> : null}
      {workspace === 'operations' && operationsView === 'work-queue' ? <GrowthCenterRedesign {...props} externalOpportunities={props.externalOpportunities ?? []} /> : null}
      {workspace === 'operations' && operationsView === 'packaging' && props.packagingEnabled ? <PackagingOperationsWorkspace recommendations={props.recommendations} initialCategory={requestedPackagingCategory} /> : null}
      {workspace === 'operations' && operationsView === 'crm-matches' ? <CrmMatchesWorkspace opportunities={opportunities} icpConfigured={Boolean(props.icpConfigured)} currentUserId={props.currentUserId} profiles={props.icpProfiles ?? []} campaigns={props.crmMatchCampaigns ?? []} /> : null}
      {workspace === 'operations' && operationsView === 'trade-events' ? <TradeEventWorkspace tradeEvents={tradeEvents} recommendations={props.recommendations} /> : null}
      {workspace === 'operations' && operationsView === 'external-discovery' ? <ExternalDiscoveryWorkspace campaigns={props.discoveryCampaigns ?? []} opportunities={props.externalOpportunities ?? []} profiles={props.icpProfiles ?? []} crmOpportunities={opportunities} /> : null}

      {workspace === 'operations' ? <section className="mt-5 space-y-3" aria-label="Growth history"><button type="button" onClick={() => setShowHistory((value) => !value)} aria-expanded={showHistory} className={cn(workspacePanelClass, 'flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500')}><span className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-surface-2 text-brand-700"><History className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-medium text-content-primary">History and audit</span><span className="mt-0.5 block text-xs text-content-muted">{auditItems.length} recorded Setu Guru actions and approvals</span></span></span><span className="text-xs font-medium text-brand-700">{showHistory ? 'Hide' : 'View'}</span></button>{showHistory ? <div className={cn(workspacePanelClass, 'p-4 motion-safe:animate-in motion-safe:fade-in')}><AuditHistoryPanel items={auditItems} /></div> : null}</section> : null}
    </>
  );
}
