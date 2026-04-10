'use client';

import type { ReactElement } from 'react';
import { buildLeadActivityTimeline } from '@/lib/activity-timeline';
import { ActivityTimeline } from '@/components/ui/activity-timeline';

type Lead = { id: string; company_name: string; created_at?: string | null; updated_at?: string | null; notes?: string | null };
export type LeadFollowUp = { id: string; lead_id: string | null; scheduled_at: string | null; status: string; created_at?: string | null; completed_at?: string | null; notes?: string | null };
export type LeadActivity = { id: string; lead_id: string; kind: string; message: string; occurred_at: string };
export type LeadStageHistory = { id: string; from_stage_id: string | null; to_stage_id: string | null; changed_at: string; note: string | null };
export type LeadRfq = { id: string; lead_id: string | null; status: string; currency: string | null; validity_date: string | null; created_at: string | null; updated_at: string | null };
export type LeadQuote = { id: string; lead_id: string; rfq_id: string | null; status: string; currency: string | null; created_at: string; updated_at: string; quote_number?: string | null };
export type LeadComplianceItem = { id: string; lead_id: string; compliance_item_id: string; status: string; created_at: string; submitted_at: string | null; approved_at: string | null; reviewed_at?: string | null; review_notes?: string | null; reviewer_name?: string | null };
export type ComplianceDefinition = { id: string; code: string; description: string };
export type LeadCommunication = { id: string; lead_id: string | null; quote_id?: string | null; related_entity?: string | null; related_id?: string | null; communication_type: string; channel?: string | null; subject?: string | null; summary?: string | null; status?: string | null; draft_source?: string | null; created_at: string; sent_at?: string | null; scheduled_at?: string | null; metadata?: unknown | null };

interface LeadRecentSectionProps {
  lead: Lead;
  followUps: LeadFollowUp[];
  activities: LeadActivity[];
  stageHistory?: LeadStageHistory[];
  rfqs?: LeadRfq[];
  quotes?: LeadQuote[];
  complianceItems?: LeadComplianceItem[];
  complianceDefinitions?: ComplianceDefinition[];
  stageNameMap?: Map<string, string>;
  communications?: LeadCommunication[];
}

export default function LeadRecentSection({ lead, followUps, activities, stageHistory = [], rfqs = [], quotes = [], complianceItems = [], complianceDefinitions = [], communications = [], stageNameMap = new Map<string, string>() }: LeadRecentSectionProps): ReactElement {
  const events = buildLeadActivityTimeline({ lead, followUps, activities, stageHistory, rfqs, quotes, complianceItems, complianceDefinitions, communications, stageNameMap });

  return (
    <section className="rounded-3xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Unified activity timeline</p>
          <p className="mt-1 text-sm text-slate-500">Recent lead, RFQ, quote, compliance, note, and follow-up events in one feed.</p>
        </div>
      </div>
      <div className="mt-4">
        <ActivityTimeline events={events.slice(0, 8)} emptyLabel="No activity yet." />
      </div>
    </section>
  );
}
