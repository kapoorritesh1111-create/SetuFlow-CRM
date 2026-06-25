'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LeadDrawer } from '@/features/leads/components/lead-drawer';
import { scheduleLeadFollowUp } from '@/features/leads/server/actions';
import { createLeadQuoteDraftFromLead } from '@/features/quotes/server/lead-draft-actions';
import type { LeadProfileData } from '@/lib/queries/leads';
import type { LeadOpenStep } from '@/features/leads/types/workspace';

// S37-UX-009/010: the premium Lead Detail action bar keeps the full workspace actions,
// but quote CTAs now respect terminal quote states. Accepted/rejected/expired/cancelled
// quotes are preserved as locked records and get a fresh create-new-draft path.

const TEAL = '#0d9488';
const NAVY = '#0b2e4a';
const GREEN = '#059669';
const AMBER = '#f59e0b';
const TERMINAL_QUOTE_STATUSES = new Set(['accepted', 'rejected', 'expired', 'cancelled']);

const btnBase: CSSProperties = { padding: '9px 15px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', border: '1px solid transparent', whiteSpace: 'nowrap' };
const ghost: CSSProperties = { ...btnBase, background: 'white', border: '1px solid #d6e0ea', color: '#334155' };
const primary: CSSProperties = { ...btnBase, background: TEAL, border: `1px solid ${TEAL}`, color: 'white' };
const amber: CSSProperties = { ...btnBase, background: AMBER, border: `1px solid ${AMBER}`, color: '#1f2937' };

function getLatestQuote(quotes: any[]) {
  return [...(quotes ?? [])].sort((left, right) => {
    const leftTime = Date.parse(String(left?.updated_at ?? left?.created_at ?? '')) || 0;
    const rightTime = Date.parse(String(right?.updated_at ?? right?.created_at ?? '')) || 0;
    return rightTime - leftTime;
  })[0] ?? null;
}

function QuoteDraftForm({ leadId, sourceQuoteId, label, forceNew, style }: { leadId: string; sourceQuoteId?: string | null; label: string; forceNew?: boolean; style: CSSProperties }) {
  return (
    <form action={createLeadQuoteDraftFromLead} style={{ display: 'inline-flex' }}>
      <input type="hidden" name="lead_id" value={leadId} />
      {sourceQuoteId ? <input type="hidden" name="source_quote_id" value={sourceQuoteId} /> : null}
      <input type="hidden" name="force_new" value={forceNew ? 'true' : 'false'} />
      <button type="submit" style={style}>{label}</button>
    </form>
  );
}

export default function LeadDetailActionBar({ data, currentUserId, quoteHref, shareHref, isQualified }: { data: LeadProfileData; currentUserId?: string; quoteHref: string; shareHref: string; isQualified: boolean }) {
  const router = useRouter();
  const lead = data.lead;
  const [drawer, setDrawer] = useState<{ open: boolean; step: LeadOpenStep }>({ open: false, step: 'basics' });
  const [followOpen, setFollowOpen] = useState(false);
  const [followAt, setFollowAt] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!lead) return null;

  const latestQuote = getLatestQuote(data.quotes as any[]);
  const latestQuoteStatus = String(latestQuote?.status ?? '').toLowerCase();
  const latestQuoteIsTerminal = latestQuote ? TERMINAL_QUOTE_STATUSES.has(latestQuoteStatus) : false;
  const latestQuoteHref = latestQuote?.id ? `/leads/${lead.id}/quote?quoteId=${latestQuote.id}` : quoteHref;

  const selectedProductIds = (data.linkedProducts ?? []).map((p) => p.id).filter(Boolean);
  const selectedMarketIds = (data.linkedMarkets ?? []).map((m) => m.id).filter(Boolean);

  function openDrawer(step: LeadOpenStep) {
    setNotice(null);
    setDrawer({ open: true, step });
  }

  function submitFollowUp() {
    if (!followAt) { setNotice({ tone: 'err', text: 'Choose a follow-up date and time.' }); return; }
    const fd = new FormData();
    fd.set('lead_id', lead!.id);
    fd.set('scheduled_at', new Date(followAt).toISOString());
    startTransition(() => {
      void scheduleLeadFollowUp(undefined, fd).then((result) => {
        if (result?.error) { setNotice({ tone: 'err', text: result.error }); return; }
        setNotice({ tone: 'ok', text: 'Follow-up scheduled.' });
        setFollowOpen(false);
        setFollowAt('');
        router.refresh();
      });
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => openDrawer('basics')} style={ghost}>Edit Lead</button>
        <button type="button" onClick={() => setFollowOpen((v) => !v)} style={ghost}>Schedule Follow-up</button>
        {!isQualified ? (
          <button type="button" onClick={() => openDrawer('workflow')} style={amber}>Qualify &amp; Map</button>
        ) : null}
        <Link href={shareHref} style={ghost}>Share Price List</Link>
        {latestQuoteIsTerminal ? (
          <>
            <Link href={latestQuoteHref} style={ghost}>View Locked Quote</Link>
            <QuoteDraftForm leadId={lead.id} sourceQuoteId={latestQuote?.id ?? null} label="Create New Quote" forceNew style={primary} />
          </>
        ) : latestQuote ? (
          <Link href={latestQuoteHref} style={primary}>Open Current Quote</Link>
        ) : (
          <QuoteDraftForm leadId={lead.id} label="Create Quote" style={primary} />
        )}
      </div>

      {followOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px' }}>
          <input type="datetime-local" value={followAt} onChange={(e) => setFollowAt(e.target.value)} style={{ border: '1px solid #dbe6ef', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} />
          <button type="button" disabled={pending} onClick={submitFollowUp} style={{ ...btnBase, padding: '7px 13px', background: NAVY, color: 'white', opacity: pending ? 0.6 : 1 }}>{pending ? 'Saving…' : 'Schedule'}</button>
        </div>
      ) : null}

      {notice ? (
        <div style={{ fontSize: '11px', fontWeight: 600, color: notice.tone === 'ok' ? GREEN : '#b91c1c' }}>{notice.text}</div>
      ) : null}

      <LeadDrawer
        open={drawer.open}
        mode="full"
        initialStepId={drawer.step}
        lead={lead as any}
        currentUserId={currentUserId}
        stages={data.stages as any}
        pipelines={data.pipelines as any}
        nextSteps={data.nextSteps as any}
        tradeEvents={data.tradeEvents as any}
        products={data.products as any}
        markets={data.markets as any}
        variants={data.variants as any}
        prices={data.prices as any}
        pricingRules={data.pricingRules as any}
        profiles={data.profiles as any}
        countries={data.countries as any}
        followUps={data.followUps as any}
        activities={data.activities as any}
        stageHistory={data.stageHistory as any}
        rfqs={data.rfqs as any}
        quotes={data.quotes as any}
        quoteVersions={data.quoteVersions as any}
        documents={data.documents as any}
        complianceItems={data.complianceItems as any}
        complianceDefinitions={data.complianceDefinitions as any}
        selectedMarketIds={selectedMarketIds}
        selectedProductIds={selectedProductIds}
        title="Edit Lead"
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={() => { setDrawer((d) => ({ ...d, open: false })); setNotice({ tone: 'ok', text: 'Lead updated.' }); router.refresh(); }}
        onOpenInlineQuote={(leadId) => { router.push(`/leads/${leadId}/quote`); }}
      />
    </div>
  );
}
