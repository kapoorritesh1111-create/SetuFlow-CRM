'use client';

import * as React from 'react';
import { InlineLeadWorkspaceProps, InlineQuoteBuilder, getLeadInitials } from '@/features/leads/components/workspace/leads-workspace-implementation';
import type { LeadOpenStep } from './leads-workspace-types';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function extractCapturedRequest(notes?: string | null) {
  const lines = clean(notes).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const line = [...lines].reverse().find((item) => /^(new buyer request|new supplier category|interested in products|interested in category|can supply products|can supply category):/i.test(item));
  if (!line) return '';
  return line.replace(/^(new buyer request|new supplier category|interested in products|interested in category|can supply products|can supply category):\s*/i, '').trim();
}

function ChannelButton({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} aria-label={label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50">
      {children}
    </a>
  );
}

function InlineCommandCenter(props: {
  lead: InlineLeadWorkspaceProps['lead'];
  stageName: string;
  ownerLabel: string;
  nextStepLabel: string;
  selectedProductNames: string[];
  selectedMarketNames: string[];
  readiness?: InlineLeadWorkspaceProps['readiness'];
  followUps: InlineLeadWorkspaceProps['followUps'];
  quotes: InlineLeadWorkspaceProps['quotes'];
  safeFormatDateTime: (value?: string | null) => string;
  stableNowIso: string;
  onOpenEditDrawer: (leadId: string, stepId?: LeadOpenStep) => void;
  onScheduleFollowUp: (leadId: string, scheduledAt: string) => void;
  onOpenQuoteBuilder: () => void;
  onOpenOrCreateQuote: InlineLeadWorkspaceProps['onOpenOrCreateQuote'];
  onBackToList: () => void;
}) {
  const { lead, stageName, ownerLabel, nextStepLabel, selectedProductNames, selectedMarketNames, readiness, followUps, quotes, safeFormatDateTime, stableNowIso, onOpenEditDrawer, onScheduleFollowUp, onOpenQuoteBuilder, onOpenOrCreateQuote, onBackToList } = props;
  if (!lead) return null;

  const leadAny = lead as any;
  const capturedRequest = extractCapturedRequest(leadAny.notes);
  const nextFollowUp = [...followUps].sort((a, b) => String(a.scheduled_at ?? '').localeCompare(String(b.scheduled_at ?? '')))[0] ?? null;
  const latestQuote = [...quotes].sort((a, b) => String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? '')))[0] ?? null;
  const email = clean(leadAny.email);
  const phone = clean(leadAny.phone);
  const whatsapp = clean(leadAny.whatsapp_number || leadAny.phone);
  const mailHref = email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Follow-up: ${lead.company_name}`)}` : '';
  const telHref = phone ? `tel:${phone.replace(/[^+0-9]/g, '')}` : '';
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : '';
  const coverageReady = selectedProductNames.length > 0;
  const followUpIsOverdue = nextFollowUp?.scheduled_at ? new Date(nextFollowUp.scheduled_at).getTime() < new Date(stableNowIso).getTime() : false;

  return (
    <div className="flex flex-col gap-4 bg-slate-50 px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBackToList} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">← Back to Leads list</button>
        <span className="ml-auto rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Lead Command Center</span>
      </div>

      <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white">{getLeadInitials(lead.company_name) || 'SF'}</div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{lead.company_name}</h2>
              <p className="mt-1 text-sm text-slate-500">{lead.lead_type} · Owner: {ownerLabel} · Stage: {stageName} · Source: {lead.source_label ?? lead.source_type ?? 'Trade event'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChannelButton href={mailHref} label="Email lead">✉️</ChannelButton>
            <ChannelButton href={whatsappHref} label="WhatsApp lead">💬</ChannelButton>
            <ChannelButton href={telHref} label="Call lead">☎️</ChannelButton>
            <button type="button" onClick={() => onOpenEditDrawer(lead.id, 'basics')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open / Edit</button>
            <button type="button" onClick={() => onOpenOrCreateQuote(lead.id)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">{latestQuote ? 'View quote' : 'Create quote'}</button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Coverage</p>
              <h3 className="mt-2 text-lg font-bold text-slate-950">Interest/request</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${coverageReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{coverageReady ? 'Mapped' : 'Captured'}</span>
          </div>

          {capturedRequest ? (
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Captured request</p>
              <p className="mt-2 text-base font-semibold text-slate-950">New buyer request: {capturedRequest}</p>
              {!coverageReady ? <p className="mt-2 text-sm text-slate-600">Catalog mapping available after upgrade.</p> : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Products</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedProductNames.length ? selectedProductNames.join(', ') : capturedRequest || 'No mapped product yet'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Markets</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedMarketNames.length ? selectedMarketNames.join(', ') : lead.country || 'Market not mapped yet'}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Follow-up</p>
            <h3 className="mt-2 text-lg font-bold text-slate-950">{nextFollowUp?.scheduled_at ? safeFormatDateTime(nextFollowUp.scheduled_at) : 'Not scheduled'}</h3>
            <p className={`mt-2 text-sm ${followUpIsOverdue ? 'text-rose-600' : 'text-slate-500'}`}>{followUpIsOverdue ? 'Overdue — reschedule now.' : nextStepLabel || 'Keep the lead moving with a clear next step.'}</p>
            <button type="button" onClick={() => onScheduleFollowUp(lead.id, new Date(Date.now() + 86400000).toISOString())} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Schedule tomorrow</button>
          </section>

          <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Commercial readiness</p>
            <h3 className="mt-2 text-lg font-bold text-slate-950">{readiness?.pricingReadiness === 'ready' ? 'Pricing ready' : 'Preview mode'}</h3>
            <p className="mt-2 text-sm text-slate-500">{latestQuote ? 'Quote workspace is active.' : 'Create a quote when product mapping is ready.'}</p>
            <button type="button" onClick={onOpenQuoteBuilder} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">Open quote workspace</button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InlineLeadWorkspace(props: InlineLeadWorkspaceProps) {
  const { activeView, lead, stageName, ownerLabel, nextStepLabel, selectedProductIds, selectedMarketIds, selectedProductNames, selectedMarketNames, products, markets, variants, prices, pricingRules, readiness, rfqs, quotes, quoteVersions, activities, followUps, complianceItems, complianceDefinitions, documents, safeFormatDateTime, stableNowIso, stages, inlineActionState, inlineFollowUpAt, setInlineFollowUpAt, isInlineActionPending, onOpenEditDrawer, onScheduleFollowUp, onCompleteFollowUp, onMoveToStage, onOpenOrCreateQuote, onRequestQuoteApproval, onApproveQuoteAdjustment, onRejectQuoteAdjustment, onMarkDirectOrder, onBackToList, onOpenCommandCenter, onOpenQuoteBuilder } = props;

  if (!lead) {
    return (
      <div className="flex min-h-[420px] flex-col gap-3 bg-slate-50 px-6 py-5">
        <button type="button" onClick={onBackToList} className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">← Back to Leads list</button>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Select a lead to open the workspace.</div>
      </div>
    );
  }

  if (activeView === 'quote') {
    return (
      <div id="inline-lead-workspace" className="flex flex-1 flex-col gap-4 bg-slate-50 px-6 py-4">
        <InlineQuoteBuilder
          lead={lead}
          stageName={stageName}
          ownerLabel={ownerLabel}
          selectedProductIds={selectedProductIds}
          selectedMarketIds={selectedMarketIds}
          selectedProductNames={selectedProductNames}
          selectedMarketNames={selectedMarketNames}
          products={products}
          markets={markets}
          variants={variants}
          prices={prices}
          pricingRules={pricingRules}
          readiness={readiness}
          rfqs={rfqs}
          quotes={quotes}
          quoteVersions={quoteVersions}
          documents={documents}
          complianceItems={complianceItems}
          complianceDefinitions={complianceDefinitions}
          safeFormatDateTime={safeFormatDateTime}
          stableNowIso={stableNowIso}
          inlineActionState={inlineActionState}
          isInlineActionPending={isInlineActionPending}
          onOpenOrCreateQuote={onOpenOrCreateQuote}
          onRequestQuoteApproval={onRequestQuoteApproval}
          onApproveQuoteAdjustment={onApproveQuoteAdjustment}
          onRejectQuoteAdjustment={onRejectQuoteAdjustment}
          onMarkDirectOrder={onMarkDirectOrder}
          onOpenCommandCenter={onOpenCommandCenter}
          onOpenCoverageManager={() => undefined}
        />
      </div>
    );
  }

  return (
    <div id="inline-lead-workspace" className="flex flex-1 flex-col gap-4 bg-slate-50">
      <InlineCommandCenter
        lead={lead}
        stageName={stageName}
        ownerLabel={ownerLabel}
        nextStepLabel={nextStepLabel}
        selectedProductNames={selectedProductNames}
        selectedMarketNames={selectedMarketNames}
        readiness={readiness}
        followUps={followUps}
        quotes={quotes}
        safeFormatDateTime={safeFormatDateTime}
        stableNowIso={stableNowIso}
        onOpenEditDrawer={onOpenEditDrawer}
        onScheduleFollowUp={onScheduleFollowUp}
        onOpenQuoteBuilder={onOpenQuoteBuilder}
        onOpenOrCreateQuote={onOpenOrCreateQuote}
        onBackToList={onBackToList}
      />
    </div>
  );
}

export { InlineLeadWorkspace, InlineCommandCenter };
