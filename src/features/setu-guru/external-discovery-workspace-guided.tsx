'use client';

import { useMemo, useState } from 'react';
import { Compass, Plus, ShieldCheck, Sparkles } from 'lucide-react';

import {
  ExternalDiscoveryWorkspace as LegacyExternalDiscoveryWorkspace,
  type DiscoveryCampaign as LegacyDiscoveryCampaign,
  type ExternalOpportunity,
} from '@/features/setu-guru/external-discovery-workspace';
import { ExternalDiscoveryCampaignBuilder } from '@/features/setu-guru/external-discovery-campaign-builder';
import { workspaceMetricClass, workspacePanelClass, workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';
import type { IcpProfile } from '@/lib/setu-guru/icp';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import { cn } from '@/lib/utils';

export type DiscoveryCampaign = LegacyDiscoveryCampaign & {
  campaign_mode?: 'saved_icp' | 'new_market' | 'lookalike' | 'fresh_research' | 'supplier_partner';
  research_direction?: 'buyers' | 'suppliers' | 'partners' | 'manufacturers';
  scope_status?: 'draft' | 'needs_input' | 'ready' | 'researching' | 'completed' | 'archived';
  search_config?: Record<string, unknown>;
  icp_snapshot?: Record<string, unknown>;
};

export type { ExternalOpportunity };

type Props = {
  campaigns: DiscoveryCampaign[];
  opportunities: ExternalOpportunity[];
  profiles: IcpProfile[];
  crmOpportunities: OpportunityCard[];
};

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className={cn(workspaceMetricClass, 'p-3')}>
      <p className="text-caption uppercase text-content-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium text-content-primary">{value}</p>
      <p className="mt-1 text-[11px] text-content-muted">{detail}</p>
    </div>
  );
}

export function ExternalDiscoveryWorkspace({ campaigns, opportunities, profiles, crmOpportunities }: Props) {
  const [showBuilder, setShowBuilder] = useState(false);
  const metrics = useMemo(() => {
    const ready = campaigns.filter((campaign) => campaign.scope_status === 'ready').length;
    const reviewing = opportunities.filter((item) => item.review_status === 'reviewing').length;
    const converted = opportunities.filter((item) => item.review_status === 'converted').length;
    return { ready, reviewing, converted };
  }, [campaigns, opportunities]);

  return (
    <section className="space-y-4" aria-label="Guided External Discovery workspace">
      <div className={cn(workspacePanelClass, 'overflow-hidden shadow-sm')}>
        <div className="flex flex-col gap-4 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-5 text-white lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-white/65"><Sparkles className="h-4 w-4" />AI-powered external growth</div>
            <h1 className="mt-2 text-2xl font-medium">Find new companies outside your CRM with a confirmed scope</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">Start from an ICP, enter a new market, use a successful customer as a lookalike, or create fresh research. Every campaign shows the market, products, and company types that will actually be used.</p>
          </div>
          <button type="button" onClick={() => setShowBuilder((value) => !value)} className={cn('inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-medium', workspacePrimaryButtonClass)}><Plus className="h-4 w-4" />{showBuilder ? 'Hide campaign setup' : 'New Growth campaign'}</button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Campaigns" value={campaigns.length} detail="Saved discovery scopes" />
          <Metric label="Ready to research" value={metrics.ready} detail="Scope confirmed by a user" />
          <Metric label="External prospects" value={opportunities.length} detail="Outside CRM until approved" />
          <Metric label="In review" value={metrics.reviewing} detail="Human review underway" />
          <Metric label="Converted" value={metrics.converted} detail="Approved CRM conversions" />
        </div>

        <div className="border-t border-line px-4 py-3">
          <div className="flex items-start gap-3 rounded-card border border-line bg-surface-2 p-3 text-sm">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-card bg-success-bg text-success-fg"><ShieldCheck className="h-4 w-4" /></span>
            <div><p className="font-medium text-content-primary">Human approval remains required</p><p className="mt-1 text-xs leading-5 text-content-muted">Saving a campaign does not run research, create a lead, or send outreach. Provider research starts only from the separate Run research action after the scope is confirmed.</p></div>
          </div>
        </div>
      </div>

      {showBuilder ? <ExternalDiscoveryCampaignBuilder profiles={profiles} crmOpportunities={crmOpportunities} onCreated={() => { setShowBuilder(false); window.location.reload(); }} onCancel={() => setShowBuilder(false)} /> : null}

      <div className="[&>section>div:first-child]:hidden">
        <LegacyExternalDiscoveryWorkspace campaigns={campaigns} opportunities={opportunities} />
      </div>

      {!campaigns.length && !opportunities.length && !showBuilder ? (
        <div className={cn(workspacePanelClass, 'grid min-h-48 place-items-center p-8 text-center')}>
          <div><Compass className="mx-auto h-9 w-9 text-content-muted" /><p className="mt-3 text-sm font-medium text-content-primary">Start your first guided campaign</p><p className="mt-1 text-xs text-content-muted">Confirm the business goal, target market, company type, and research quality before using OpenAI.</p></div>
        </div>
      ) : null}
    </section>
  );
}
