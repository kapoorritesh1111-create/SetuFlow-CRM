'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isPipelineInJourney } from '@/lib/journey';
import type { LeadJourney } from '@/lib/journey';
import type { PipelineBoardProps, Stage } from '@/features/pipeline/types/board';
import { PipelineBoard } from './pipeline-board';
import { PipelineForecastView } from './PipelineForecastView';
import { PipelineSwimlaneView } from './PipelineSwimlaneView';

type BoardView = 'kanban' | 'swimlane' | 'forecast';
type Density = 'full' | 'compact' | 'micro';

type StageGroup = {
  name: string;
  stages: Stage[];
  sort_order: number;
  ref: Stage;
};

const normalizeMode = (value: string | null): '' | LeadJourney => {
  if (value === 'buyers' || value === 'buyer') return 'buyer';
  if (value === 'suppliers' || value === 'supplier') return 'supplier';
  return '';
};

const tabLabel: Record<BoardView, string> = {
  kanban: 'Kanban',
  swimlane: 'Swimlane',
  forecast: 'Forecast',
};

const densityLabel: Record<Density, string> = {
  full: 'Full detail view',
  compact: 'Compact scan mode',
  micro: 'Micro scanning mode',
};

export function PipelineBoardViewShell(props: PipelineBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [boardView, setBoardView] = useState<BoardView>('kanban');
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window === 'undefined') return 'compact';
    const saved = window.localStorage.getItem('pipeline-density');
    return saved === 'full' || saved === 'compact' || saved === 'micro' ? saved : 'compact';
  });

  const activeLeadType = normalizeMode(searchParams.get('mode')) || props.initialLeadType || '';
  const search = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const ownerId = searchParams.get('owner') ?? '';
  const productId = searchParams.get('product') ?? searchParams.get('category') ?? '';
  const marketId = searchParams.get('market') ?? '';
  const countryId = searchParams.get('country') ?? '';
  const tradeEventId = searchParams.get('event') ?? '';

  const setJourneyMode = (mode: '' | LeadJourney) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode) params.set('mode', mode);
    else params.delete('mode');
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  };

  const setPipelineDensity = (nextDensity: Density) => {
    setDensity(nextDensity);
    if (typeof window !== 'undefined') window.localStorage.setItem('pipeline-density', nextDensity);
  };

  const leadMarketsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of props.leadMarkets) map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item.market_id]);
    return map;
  }, [props.leadMarkets]);

  const leadProductsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of props.leadProductInterests) map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item.product_id]);
    return map;
  }, [props.leadProductInterests]);

  const stageGroups = useMemo<StageGroup[]>(() => {
    const grouped = new Map<string, StageGroup>();
    for (const stage of props.stages) {
      const existing = grouped.get(stage.name);
      if (existing) {
        existing.stages.push(stage);
        if (stage.sort_order < existing.sort_order) {
          existing.sort_order = stage.sort_order;
          existing.ref = stage;
        }
      } else {
        grouped.set(stage.name, { name: stage.name, stages: [stage], sort_order: stage.sort_order, ref: stage });
      }
    }
    const groups = Array.from(grouped.values()).sort((left, right) => left.sort_order - right.sort_order);
    if (!activeLeadType) return groups;
    const allowedPipelineIds = props.pipelines.filter((pipeline) => isPipelineInJourney(pipeline.lead_type, activeLeadType)).map((pipeline) => pipeline.id);
    return groups.filter((group) => group.stages.some((stage) => allowedPipelineIds.includes(stage.pipeline_id)));
  }, [activeLeadType, props.pipelines, props.stages]);

  const filteredLeads = useMemo(() => {
    return props.leads.filter((lead) => {
      const matchesSearch = !search || [lead.company_name, lead.contact_name ?? '', lead.country ?? ''].some((item) => item.toLowerCase().includes(search));
      const matchesOwner = !ownerId || lead.owner_user_id === ownerId;
      const matchesProduct = !productId || (leadProductsMap.get(lead.id)?.includes(productId) ?? false);
      const matchesMarket = !marketId || (leadMarketsMap.get(lead.id)?.includes(marketId) ?? false);
      const matchesCountry = !countryId || lead.country_id === countryId;
      const matchesTradeEvent = !tradeEventId || lead.trade_event_id === tradeEventId;
      const matchesLeadType = !activeLeadType || lead.lead_type === activeLeadType;
      return matchesSearch && matchesOwner && matchesProduct && matchesMarket && matchesCountry && matchesTradeEvent && matchesLeadType;
    });
  }, [activeLeadType, countryId, leadMarketsMap, leadProductsMap, marketId, ownerId, productId, props.leads, search, tradeEventId]);

  const ownerLabelById = useMemo(() => new Map(props.profiles.map((profile) => [profile.id, profile.full_name ?? profile.username ?? 'Unassigned'])), [props.profiles]);
  const valueCurrency = filteredLeads.find((lead) => lead.deal_currency)?.deal_currency ?? 'USD';
  const buildLeadHref = (leadId: string) => `/leads/${leadId}?returnTo=/pipeline`;

  const leadTypeTabs: Array<{ value: '' | LeadJourney; label: string; count: number }> = [
    { value: '', label: 'All', count: props.leads.length },
    { value: 'buyer', label: 'Buyer', count: props.leads.filter((lead) => lead.lead_type === 'buyer').length },
    { value: 'supplier', label: 'Supplier', count: props.leads.filter((lead) => lead.lead_type === 'supplier').length },
  ];

  return (
    <div className="sf-pipeline-shell" data-pipeline-density={density}>
      <style jsx global>{`
        .sf-pipeline-shell-kanban > div[style*="min-height"] > div.flex.items-center.gap-3.border-b.border-slate-100.bg-white.px-5.py-2 {
          display: none !important;
        }
        .sf-pipeline-shell[data-pipeline-density='compact'] .sf-pipeline-shell-kanban div[style*='width: 256px'] {
          width: 220px !important;
        }
        .sf-pipeline-shell[data-pipeline-density='micro'] .sf-pipeline-shell-kanban div[style*='width: 256px'] {
          width: 180px !important;
        }
        .sf-pipeline-shell[data-pipeline-density='compact'] .sf-pipeline-shell-kanban div[style*='border-left: 3px solid'] {
          padding: 8px 9px !important;
          border-radius: 11px !important;
        }
        .sf-pipeline-shell[data-pipeline-density='micro'] .sf-pipeline-shell-kanban div[style*='border-left: 3px solid'] {
          padding: 7px 8px !important;
          border-radius: 10px !important;
        }
        .sf-pipeline-shell[data-pipeline-density='compact'] .sf-pipeline-shell-kanban div[style*='border-left: 3px solid'] > div:nth-child(2),
        .sf-pipeline-shell[data-pipeline-density='compact'] .sf-pipeline-shell-kanban div[style*='border-left: 3px solid'] > div:nth-child(3) {
          display: none !important;
        }
        .sf-pipeline-shell[data-pipeline-density='micro'] .sf-pipeline-shell-kanban div[style*='border-left: 3px solid'] > div:nth-child(n+2) {
          display: none !important;
        }
        .sf-pipeline-shell[data-pipeline-density='micro'] .sf-pipeline-shell-kanban div[style*='border-left: 3px solid'] div[style*='font-size: 10px'] {
          display: none !important;
        }
        .sf-pipeline-shell[data-pipeline-density='micro'] .sf-pipeline-shell-kanban div[style*='border-left: 3px solid'] div[style*='font-size: 12px'] {
          font-size: 11px !important;
        }
      `}</style>

      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-5 py-2 shadow-sm">
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
          {(['kanban', 'swimlane', 'forecast'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setBoardView(view)}
              className={`h-9 px-4 text-[11px] font-bold transition ${boardView === view ? 'bg-[#0b1f3a] text-white' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              {tabLabel[view]}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 md:flex" aria-label="Lead type filter">
          {leadTypeTabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setJourneyMode(tab.value)}
              className={`h-7 rounded-lg px-3 text-[10px] font-extrabold transition ${activeLeadType === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
            >
              {tab.label} <span className="ml-1 text-[9px] opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400">Density:</span>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
            {(['full', 'compact', 'micro'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPipelineDensity(option)}
                className={`h-9 px-4 text-[11px] font-bold capitalize transition ${density === option ? 'bg-[#0b1f3a] text-white' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <span className="hidden text-[10px] font-medium text-slate-400 lg:inline">{densityLabel[density]}</span>
        </div>
      </div>

      {boardView === 'kanban' ? (
        <div className="sf-pipeline-shell-kanban">
          <PipelineBoard {...props} />
        </div>
      ) : boardView === 'swimlane' ? (
        <PipelineSwimlaneView
          leads={filteredLeads}
          stageGroups={stageGroups}
          ownerLabelById={ownerLabelById}
          valueCurrency={valueCurrency}
          buildLeadHref={buildLeadHref}
        />
      ) : (
        <PipelineForecastView
          leads={filteredLeads}
          stageGroups={stageGroups}
          valueCurrency={valueCurrency}
          buildLeadHref={buildLeadHref}
        />
      )}
    </div>
  );
}
