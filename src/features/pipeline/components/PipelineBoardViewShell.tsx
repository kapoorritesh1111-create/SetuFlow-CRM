'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isPipelineInJourney } from '@/lib/journey';
import type { LeadJourney } from '@/lib/journey';
import type { PipelineBoardProps, Stage } from '@/features/pipeline/types/board';
import { PipelineBoard } from './pipeline-board';
import { PipelineForecastView } from './PipelineForecastView';
import { PipelineSwimlaneView } from './PipelineSwimlaneView';

type BoardView = 'kanban' | 'swimlane' | 'forecast';

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

export function PipelineBoardViewShell(props: PipelineBoardProps) {
  const searchParams = useSearchParams();
  const [boardView, setBoardView] = useState<BoardView>('kanban');

  const activeLeadType = normalizeMode(searchParams.get('mode')) || props.initialLeadType || '';
  const search = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const ownerId = searchParams.get('owner') ?? '';
  const productId = searchParams.get('product') ?? searchParams.get('category') ?? '';
  const marketId = searchParams.get('market') ?? '';
  const countryId = searchParams.get('country') ?? '';
  const tradeEventId = searchParams.get('event') ?? '';

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

  return (
    <div className="space-y-4">
      <div className="mx-5 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-slate-400">Pipeline view</p>
          <p className="text-sm font-bold text-slate-700">Switch between board, portfolio swimlane, and forecast review.</p>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-slate-200">
          {(['kanban', 'swimlane', 'forecast'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setBoardView(view)}
              className={`h-9 px-4 text-[11px] font-bold transition ${boardView === view ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              {tabLabel[view]}
            </button>
          ))}
        </div>
      </div>

      {boardView === 'kanban' ? (
        <PipelineBoard {...props} />
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
