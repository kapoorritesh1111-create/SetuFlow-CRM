'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  CircleAlert,
  Compass,
  Database,
  ExternalLink,
  Info,
  PencilLine,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { ExternalDiscoveryCampaignBuilder } from '@/features/setu-guru/external-discovery-campaign-builder';
import { ExternalDiscoveryCampaignEditor } from '@/features/setu-guru/external-discovery-campaign-editor';
import {
  PremiumExternalDiscoveryResults,
  type PremiumExternalOpportunity,
} from '@/features/setu-guru/external-discovery-premium-results';
import type { ExternalOpportunity } from '@/features/setu-guru/external-discovery-workspace';
import {
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import type { IcpProfile } from '@/lib/setu-guru/icp';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import {
  campaignProviderOutcome,
  campaignSourceStrategy,
  discoveryList,
  discoveryObject,
  discoveryText,
  isLegacyDiscoveryCampaign,
  legacyCampaignHasMixedDirections,
  resolveCampaignDisplayState,
  type DiscoveryCampaignJobSnapshot,
} from '@/lib/setu-guru/external-discovery-status';
import { cn } from '@/lib/utils';

export type DiscoveryCampaign = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  icp_profile_id?: string | null;
  campaign_mode?: 'saved_icp' | 'new_market' | 'lookalike' | 'fresh_research' | 'supplier_partner';
  research_direction?: 'buyers' | 'suppliers' | 'partners' | 'manufacturers';
  scope_status?: 'draft' | 'needs_input' | 'ready' | 'researching' | 'completed' | 'archived';
  search_config?: Record<string, unknown>;
  icp_snapshot?: Record<string, unknown>;
  latest_job?: DiscoveryCampaignJobSnapshot | null;
  result_count?: number;
};

export type { ExternalOpportunity };

type Props = {
  campaigns: DiscoveryCampaign[];
  opportunities: ExternalOpportunity[];
  profiles: IcpProfile[];
  crmOpportunities: OpportunityCard[];
};

const MODE_LABELS: Record<string, string> = {
  saved_icp: 'Saved ICP',
  new_market: 'Same ICP, new market',
  lookalike: 'Lookalike company',
  fresh_research: 'Fresh research',
  supplier_partner: 'Supplier or partner search',
};

const ACTION_LABELS: Record<string, string> = {
  complete_scope: 'Complete scope',
  review_scope: 'Review and confirm scope',
  start_research: 'Start research',
  view_results: 'View results',
  review_rejected_rows: 'Review rejected rows',
  correct_and_retry: 'Correct and retry',
  open_crm_matches: 'Open CRM Matches',
  configure_provider: 'Configure research provider',
};

const TONE_CLASS: Record<string, string> = {
  neutral: 'bg-surface-2 text-content-secondary',
  info: 'bg-info-bg text-brand-800',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
};

function CampaignModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-campaign-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[calc(100vh-1rem)] min-h-[70vh] w-full max-w-[1500px] overflow-y-auto rounded-2xl bg-surface-1 shadow-2xl sm:max-h-[calc(100vh-2rem)] [&>section]:mt-0 [&>section>header]:sticky [&>section>header]:top-0 [&>section>header]:z-20"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function CompactMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-[118px] items-center justify-between gap-4 border-r border-line px-4 py-2 last:border-r-0">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-content-muted">{label}</span>
      <span className="text-lg font-semibold text-content-primary">{value}</span>
    </div>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not run yet';
}

function count(response: Record<string, unknown>, key: string) {
  const value = Number(response[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <dt className="text-content-muted">{label}</dt>
      <dd className="font-medium text-content-secondary">{value}</dd>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-ctl border border-line bg-surface-1 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-content-muted">{label}</p>
      <p className="text-sm font-semibold text-content-primary">{value}</p>
    </div>
  );
}

function PrimaryScope({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-content-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-medium capitalize text-content-primary" title={value}>{value}</p>
    </div>
  );
}

function CampaignDetail({ campaign, profile }: { campaign: DiscoveryCampaign; profile?: IcpProfile }) {
  const config = discoveryObject(campaign.search_config);
  const snapshot = discoveryObject(campaign.icp_snapshot);
  const job = campaign.latest_job;
  const request = discoveryObject(job?.provider_request);
  const response = discoveryObject(job?.provider_response);
  const resolved = discoveryObject(response.resolved_scope);
  const campaignMarkets = discoveryList(config.resolved_target_countries).length
    ? discoveryList(config.resolved_target_countries)
    : discoveryList(config.target_countries);
  const savedMarkets = discoveryList(config.saved_icp_target_countries).length
    ? discoveryList(config.saved_icp_target_countries)
    : discoveryList(profile?.target_countries);
  const resolvedMarkets = discoveryList(resolved.target_countries).length
    ? discoveryList(resolved.target_countries)
    : campaignMarkets;
  const inherited = ['products', 'target_company_types', 'target_industries', 'search_languages', 'source_requirements']
    .filter((key) => discoveryList(config[key]).length > 0);
  const overridden = savedMarkets.join('|') !== campaignMarkets.join('|') ? ['Market'] : [];
  const rejectionReasons = discoveryObject(response.rejection_reasons);
  const partialFailures = discoveryList(response.partial_failures);
  const researchPlan = discoveryList(response.research_plan).length
    ? discoveryList(response.research_plan)
    : discoveryList(request.researchPlan);

  return (
    <details className="mt-3 rounded-card border border-line bg-surface-2">
      <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-brand-800">
        View confirmed scope and diagnostics
      </summary>
      <div className="grid gap-5 border-t border-line p-4 xl:grid-cols-2">
        <section>
          <h4 className="text-sm font-medium text-content-primary">1 — Confirmed scope</h4>
          <dl className="mt-2 grid gap-2 text-xs">
            <Detail label="Objective" value={discoveryText(config.objective || config.goal) || 'Not confirmed'} />
            <Detail label="Market" value={campaignMarkets.join(', ') || 'Not confirmed'} />
            <Detail label="Products" value={discoveryList(config.products).join(', ') || discoveryList(snapshot.products).join(', ') || 'Not confirmed'} />
            <Detail label="Direction" value={campaign.research_direction || discoveryText(config.research_direction) || 'Not confirmed'} />
            <Detail label="Company types" value={discoveryList(config.target_company_types).join(', ') || 'Not confirmed'} />
            <Detail label="Industries" value={discoveryList(config.target_industries).join(', ') || 'None specified'} />
            <Detail label="Exclusions" value={discoveryList(config.excluded_company_types).join(', ') || 'None specified'} />
            <Detail label="Languages" value={discoveryList(config.search_languages).join(', ') || 'English'} />
            <Detail label="Evidence" value={discoveryList(config.source_requirements).join(', ') || 'Source-backed evidence'} />
            <Detail label="Result controls" value={`${config.result_limit ?? 25} results · ${config.minimum_fit_score ?? 60}% minimum fit`} />
          </dl>
        </section>
        <section>
          <h4 className="text-sm font-medium text-content-primary">2 — ICP inheritance</h4>
          <dl className="mt-2 grid gap-2 text-xs">
            <Detail label="Selected ICP" value={profile?.name || discoveryText(snapshot.name) || 'Campaign-specific scope'} />
            <Detail label="Values inherited" value={inherited.join(', ') || 'Legacy ICP snapshot'} />
            <Detail label="Values overridden" value={overridden.join(', ') || 'None'} />
            <Detail label="Saved ICP market" value={savedMarkets.join(', ') || 'Not available'} />
            <Detail label="Campaign market" value={campaignMarkets.join(', ') || 'Not confirmed'} />
            <Detail label="Resolved market" value={resolvedMarkets.join(', ') || 'Not run yet'} />
          </dl>
          <p className="mt-3 rounded-ctl bg-info-bg p-2 text-xs text-brand-800">
            The saved ICP was not changed. Campaign overrides apply only to this research campaign.
          </p>
        </section>
        <section>
          <h4 className="text-sm font-medium text-content-primary">3 — Research execution</h4>
          <dl className="mt-2 grid gap-2 text-xs">
            <Detail label="Provider" value={discoveryText(response.provider || job?.provider_key) || 'Automatic selection on run'} />
            <Detail label="Model" value={discoveryText(response.model) || 'Not run yet'} />
            <Detail label="Response ID" value={discoveryText(response.response_id) || 'Not available'} />
            <Detail label="Started" value={formatDate(job?.started_at)} />
            <Detail label="Completed" value={formatDate(job?.completed_at)} />
            <Detail label="Outcome" value={campaignProviderOutcome(campaign)?.replaceAll('_', ' ') || 'Not run yet'} />
            <Detail label="Provider message" value={discoveryText(response.provider_message) || job?.last_error || 'No provider message yet'} />
          </dl>
          {researchPlan.length ? (
            <div className="mt-3">
              <p className="text-caption uppercase text-content-muted">Research plan</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-content-secondary">
                {researchPlan.map((task, index) => <li key={index}>{task}</li>)}
              </ol>
            </div>
          ) : null}
        </section>
        <section>
          <h4 className="text-sm font-medium text-content-primary">4 — Research diagnostics</h4>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniMetric label="Sources" value={count(response, 'sources_found')} />
            <MiniMetric label="Returned" value={count(response, 'rows_returned')} />
            <MiniMetric label="Accepted" value={count(response, 'rows_accepted_by_provider')} />
            <MiniMetric label="Inserted" value={count(response, 'rows_inserted')} />
            <MiniMetric label="Rejected" value={count(response, 'rows_rejected')} />
            <MiniMetric label="Duplicates" value={count(response, 'duplicates_detected')} />
          </div>
          {Object.keys(rejectionReasons).length ? (
            <div className="mt-3">
              <p className="text-caption uppercase text-content-muted">Rejection reasons</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-warning-fg">
                {Object.entries(rejectionReasons).map(([reason, value]) => (
                  <li key={reason}>{reason.replaceAll('_', ' ')}: {String(value)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {partialFailures.length ? (
            <div className="mt-3">
              <p className="text-caption uppercase text-content-muted">Partial failures</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-warning-fg">
                {partialFailures.map((failure, index) => <li key={index}>{failure}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </details>
  );
}

function CampaignCard({
  campaign,
  profile,
  onRefresh,
  onSelectResults,
  onEdit,
}: {
  campaign: DiscoveryCampaign;
  profile?: IcpProfile;
  onRefresh: () => Promise<void>;
  onSelectResults: () => void;
  onEdit: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(
    discoveryText(discoveryObject(campaign.latest_job?.provider_response).provider_message) || null,
  );
  const config = discoveryObject(campaign.search_config);
  const snapshot = discoveryObject(campaign.icp_snapshot);
  const response = discoveryObject(campaign.latest_job?.provider_response);
  const display = resolveCampaignDisplayState(campaign);
  const legacy = isLegacyDiscoveryCampaign(campaign);
  const mixed = legacyCampaignHasMixedDirections(campaign);
  const sourceStrategy = campaignSourceStrategy(campaign);
  const markets = discoveryList(config.resolved_target_countries).length
    ? discoveryList(config.resolved_target_countries)
    : discoveryList(config.target_countries).length
      ? discoveryList(config.target_countries)
      : discoveryList(snapshot.target_countries);
  const products = discoveryList(config.products).length
    ? discoveryList(config.products)
    : discoveryList(snapshot.products);
  const targetTypes = discoveryList(config.target_company_types).length
    ? discoveryList(config.target_company_types)
    : campaign.research_direction === 'suppliers' || campaign.research_direction === 'manufacturers'
      ? discoveryList(snapshot.supplier_types)
      : discoveryList(snapshot.buyer_types);
  const exclusions = discoveryList(config.excluded_company_types);
  const provider = discoveryText(response.provider || campaign.latest_job?.provider_key) || 'Automatic on run';
  const canRun = campaign.scope_status === 'ready'
    && sourceStrategy !== 'crm_only'
    && display.key !== 'provider_not_configured'
    && display.key !== 'scope_confirmation_required';

  async function runResearch() {
    if (!canRun || running) return;
    setRunning(true);
    setMessage('Researching the confirmed scope…');
    try {
      const apiResponse = await fetch('/api/setu-guru/external-discovery/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, providerKey: 'auto' }),
      });
      const payload = await apiResponse.json().catch(() => ({}));
      if (!apiResponse.ok) throw new Error(payload.error || 'Research could not be completed.');
      setMessage(payload.result?.message || payload.result?.diagnostics?.provider_message || 'Research completed.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Research could not be completed.');
    } finally {
      setRunning(false);
    }
  }

  const nextAction = display.nextAction === 'view_results' ? onSelectResults : undefined;
  const hasRun = Boolean(campaign.latest_job);
  const savedMarkets = discoveryList(config.saved_icp_target_countries);
  const marketOverride = Boolean(savedMarkets.length && savedMarkets.join('|') !== markets.join('|'));

  return (
    <article className={cn(workspacePanelClass, 'overflow-hidden shadow-sm')}>
      <div className="flex flex-col gap-3 px-5 py-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', TONE_CLASS[display.tone])}>
              {running ? 'Researching' : display.label}
            </span>
            {legacy ? <span className="rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-medium text-warning-fg">Legacy campaign</span> : null}
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-content-muted">
              {MODE_LABELS[campaign.campaign_mode || ''] || 'Legacy mode'}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-medium text-content-primary">{campaign.name}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-content-muted">{display.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {sourceStrategy === 'crm_and_external' ? (
            <a href="/growth-agent?view=crm-matches" className={cn('inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>
              Open CRM Matches
            </a>
          ) : null}
          {sourceStrategy === 'crm_only' ? (
            <a href="/growth-agent?view=crm-matches" className={cn('inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium', workspacePrimaryButtonClass)}>
              Open CRM Matches <ArrowRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
          <button type="button" onClick={onEdit} className={cn('inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>
            <PencilLine className="h-3.5 w-3.5" />
            {display.key === 'scope_confirmation_required' || legacy ? 'Edit and confirm scope' : 'Edit scope'}
          </button>
          {canRun ? (
            <button type="button" disabled={running} onClick={runResearch} className={cn('inline-flex min-h-9 items-center gap-2 rounded-ctl px-3 text-xs font-medium disabled:opacity-60', workspacePrimaryButtonClass)}>
              <RefreshCcw className={cn('h-3.5 w-3.5', running ? 'animate-spin' : '')} />
              {running ? 'Researching…' : 'Start research'}
            </button>
          ) : null}
          {nextAction ? (
            <button type="button" onClick={nextAction} className={cn('inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium', workspacePrimaryButtonClass)}>
              {ACTION_LABELS[display.nextAction]} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {mixed ? (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-ctl border border-warning-border bg-warning-bg p-3 text-xs text-warning-fg">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          This campaign contains both buyer and supplier targets. Choose one direction before running research.
        </div>
      ) : null}

      <div className="grid gap-4 border-y border-line bg-surface-2 px-5 py-3 sm:grid-cols-2 xl:grid-cols-[0.7fr_1fr_1.4fr_1.5fr]">
        <PrimaryScope label="Direction" value={campaign.research_direction || 'Not confirmed'} />
        <PrimaryScope label="Market actually searched" value={markets.join(', ') || 'Not confirmed'} />
        <PrimaryScope label="Product or service" value={products.join(', ') || 'Not confirmed'} />
        <PrimaryScope label="Target company types" value={targetTypes.join(', ') || 'Not confirmed'} />
      </div>

      <div className="flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-content-muted">
          <span><strong className="font-medium text-content-secondary">ICP:</strong> {profile?.name || discoveryText(snapshot.name) || 'Legacy snapshot'}</span>
          <span><strong className="font-medium text-content-secondary">Sources:</strong> {sourceStrategy.replaceAll('_', ' ')}</span>
          <span><strong className="font-medium text-content-secondary">Excluded:</strong> {exclusions.length ? `${exclusions.length} types` : 'None'}</span>
          <span><strong className="font-medium text-content-secondary">Override:</strong> {marketOverride ? `${savedMarkets.join(', ')} → ${markets.join(', ')}` : 'None'}</span>
          <span><strong className="font-medium text-content-secondary">Last run:</strong> {formatDate(campaign.latest_job?.completed_at || campaign.latest_job?.started_at)}</span>
        </div>
        {sourceStrategy === 'crm_and_external' ? (
          <button type="button" onClick={onSelectResults} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
            View external results
          </button>
        ) : null}
      </div>

      {hasRun ? (
        <div className="grid gap-2 border-t border-line bg-surface-2 px-5 py-3 sm:grid-cols-3 xl:grid-cols-6">
          <MiniMetric label="Sources found" value={count(response, 'sources_found')} />
          <MiniMetric label="Rows returned" value={count(response, 'rows_returned')} />
          <MiniMetric label="Rows accepted" value={count(response, 'rows_accepted_by_provider')} />
          <MiniMetric label="Rows inserted" value={count(response, 'rows_inserted')} />
          <MiniMetric label="Rows rejected" value={count(response, 'rows_rejected')} />
          <MiniMetric label="Duplicates" value={count(response, 'duplicates_detected')} />
        </div>
      ) : null}

      <div className="border-t border-line px-5 py-3 text-xs text-content-muted">
        <p>
          Provider: <strong className="text-content-secondary">{provider}</strong>
          {' · '}Model: <strong className="text-content-secondary">{discoveryText(response.model) || 'Not run yet'}</strong>
        </p>
        {message ? (
          <p className={cn('mt-2 rounded-ctl px-3 py-2 leading-5', display.tone === 'warning' || display.tone === 'danger' ? 'bg-warning-bg text-warning-fg' : 'bg-surface-2 text-content-secondary')} role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
        {display.key === 'provider_not_configured' ? (
          <button type="button" className={cn('mt-2 inline-flex min-h-9 items-center gap-1 rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>
            Configure research provider
          </button>
        ) : null}
      </div>

      <div className="px-5 pb-4">
        <CampaignDetail campaign={campaign} profile={profile} />
      </div>
    </article>
  );
}

export function ExternalDiscoveryWorkspace({ campaigns, opportunities, profiles, crmOpportunities }: Props) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignRows, setCampaignRows] = useState(campaigns);
  const [opportunityRows, setOpportunityRows] = useState(opportunities as PremiumExternalOpportunity[]);
  const [resultsAnchor, setResultsAnchor] = useState<HTMLDivElement | null>(null);
  const editingCampaign = campaignRows.find((campaign) => campaign.id === editingCampaignId) ?? null;
  const metrics = useMemo(() => ({
    ready: campaignRows.filter((campaign) => campaign.scope_status === 'ready').length,
    reviewing: opportunityRows.filter((item) => item.review_status === 'reviewing').length,
    converted: opportunityRows.filter((item) => item.review_status === 'converted').length,
  }), [campaignRows, opportunityRows]);

  async function refreshDiscovery() {
    const response = await fetch('/api/setu-guru/external-discovery/campaigns', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Discovery data could not be refreshed.');
    setCampaignRows(payload.campaigns ?? []);
    setOpportunityRows(payload.opportunities ?? []);
  }

  async function created() {
    setShowBuilder(false);
    await refreshDiscovery();
  }

  async function saved() {
    await refreshDiscovery();
    setEditingCampaignId(null);
  }

  function openNewCampaign() {
    setEditingCampaignId(null);
    setShowBuilder(true);
  }

  function openEditor(campaignId: string) {
    setShowBuilder(false);
    setEditingCampaignId(campaignId);
  }

  function openResults() {
    resultsAnchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="space-y-3" aria-label="Guided External Discovery workspace">
      <div className={cn(workspacePanelClass, 'overflow-hidden shadow-sm')}>
        <div className="flex flex-col gap-3 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-5 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/65">
              <Sparkles className="h-3.5 w-3.5" />AI-powered external growth
            </div>
            <h1 className="mt-1.5 text-xl font-medium">Find new companies outside your CRM</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/70">
              Confirm the market and buyer profile, run research, then review every company before it enters CRM.
            </p>
          </div>
          <button type="button" onClick={openNewCampaign} className={cn('inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-ctl px-4 text-xs font-medium', workspacePrimaryButtonClass)}>
            <Plus className="h-4 w-4" />New Growth campaign
          </button>
        </div>

        <div className="overflow-x-auto border-b border-line bg-surface-1">
          <div className="flex min-w-max items-center">
            <CompactMetric label="Campaigns" value={campaignRows.length} />
            <CompactMetric label="Ready" value={metrics.ready} />
            <CompactMetric label="External prospects" value={opportunityRows.length} />
            <CompactMetric label="In review" value={metrics.reviewing} />
            <CompactMetric label="Converted" value={metrics.converted} />
          </div>
        </div>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-2.5 text-xs font-medium text-content-secondary marker:hidden">
            <span className="flex items-center gap-2"><Info className="h-4 w-4 text-brand-700" />How External Discovery works and what stays protected</span>
            <span className="text-[11px] text-content-muted group-open:hidden">Show</span>
            <span className="hidden text-[11px] text-content-muted group-open:inline">Hide</span>
          </summary>
          <div className="grid gap-3 border-t border-line bg-surface-2 px-5 py-3 md:grid-cols-3">
            <div className="flex items-start gap-3 text-xs">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div><p className="font-medium text-content-primary">Internal CRM matches</p><p className="mt-0.5 text-content-muted">Existing Setu Flow records, opened separately.</p></div>
            </div>
            <div className="flex items-start gap-3 text-xs">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div><p className="font-medium text-content-primary">External prospects</p><p className="mt-0.5 text-content-muted">New source-backed companies outside CRM until approved.</p></div>
            </div>
            <div className="flex items-start gap-3 text-xs">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-fg" />
              <div><p className="font-medium text-content-primary">Human approval remains required</p><p className="mt-0.5 text-content-muted">Research never creates a lead or sends outreach.</p></div>
            </div>
          </div>
        </details>
      </div>

      {showBuilder ? (
        <CampaignModal title="Create External Discovery campaign" onClose={() => setShowBuilder(false)}>
          <ExternalDiscoveryCampaignBuilder profiles={profiles} crmOpportunities={crmOpportunities} onCreated={created} onCancel={() => setShowBuilder(false)} />
        </CampaignModal>
      ) : null}
      {editingCampaign ? (
        <CampaignModal title={`Edit ${editingCampaign.name}`} onClose={() => setEditingCampaignId(null)}>
          <ExternalDiscoveryCampaignEditor campaign={editingCampaign} profiles={profiles} onSaved={saved} onCancel={() => setEditingCampaignId(null)} />
        </CampaignModal>
      ) : null}

      {!campaignRows.length ? (
        <div className={cn(workspacePanelClass, 'grid min-h-44 place-items-center p-6 text-center')}>
          <div>
            <Compass className="mx-auto h-8 w-8 text-content-muted" />
            <p className="mt-3 text-sm font-medium text-content-primary">No campaign created</p>
            <p className="mt-1 text-xs text-content-muted">Start a guided campaign and confirm the market, product, direction, and target companies.</p>
            <button type="button" onClick={openNewCampaign} className={cn('mt-4 inline-flex min-h-9 items-center gap-2 rounded-ctl px-3 text-xs font-medium', workspacePrimaryButtonClass)}>
              <Plus className="h-3.5 w-3.5" />Start a guided campaign
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {campaignRows.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            profile={profiles.find((profile) => profile.id === campaign.icp_profile_id)}
            onRefresh={refreshDiscovery}
            onSelectResults={openResults}
            onEdit={() => openEditor(campaign.id)}
          />
        ))}
      </div>

      <div ref={setResultsAnchor}>
        {opportunityRows.length ? (
          <PremiumExternalDiscoveryResults opportunities={opportunityRows} campaigns={campaignRows} />
        ) : (
          <div className={cn(workspacePanelClass, 'flex flex-col items-center justify-center px-6 py-8 text-center')}>
            <ExternalLink className="h-7 w-7 text-content-muted" />
            <p className="mt-2 text-sm font-medium text-content-primary">No external prospects to review yet</p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-content-muted">
              The campaign card above shows whether research is ready, completed with no qualified matches, or returned companies that need source verification.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
