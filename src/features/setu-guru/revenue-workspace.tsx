'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileCheck2, Loader2, MessageSquareText, RefreshCw } from 'lucide-react';

import {
  workspaceFieldSurfaceClass,
  workspaceInsetClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import { cn } from '@/lib/utils';

type QuoteReadiness = {
  leadId: string;
  buyerLabel: string;
  missingItems: string[];
  existingQuotes: Array<{ id: string; quote_number: string | null; status: string | null }>;
  readinessLevel: 'ready' | 'needs_input' | 'no_quote_yet';
};

type ReplyAnalysis = {
  sentiment?: string;
  mainConcern?: string;
  suggestedResponse?: string;
};

function leadIdFrom(item: SetuGuruRecommendation | null) {
  if (!item) return null;
  const href = item.action_href || '';
  const match = href.match(/\/leads\/([0-9a-f-]{36})/i);
  if (match?.[1]) return match[1];
  if (/lead|buyer/i.test(item.entity_type)) return item.entity_id;
  return null;
}

function quoteLabel(item: SetuGuruRecommendation) {
  const match = item.title.match(/Q-[A-Z0-9-]+/i);
  return match?.[0] || 'Quote action';
}

export function RevenueWorkspace({ recommendations, selected }: { recommendations: SetuGuruRecommendation[]; selected: SetuGuruRecommendation | null }) {
  const revenueActions = useMemo(
    () => recommendations.filter((item) => /quote|buyer|revenue|follow.?up|order/i.test(`${item.entity_type} ${item.recommendation_type} ${item.title}`)),
    [recommendations],
  );
  const leadId = leadIdFrom(selected);
  const [readiness, setReadiness] = useState<QuoteReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [analysis, setAnalysis] = useState<ReplyAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setReadiness(null);
    setAnalysis(null);
    if (!leadId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/setu-guru/quote-readiness?leadId=${encodeURIComponent(leadId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) return null;
        return body.readiness ?? null;
      })
      .then((value) => {
        if (!cancelled) setReadiness(value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function analyze() {
    if (!leadId || replyText.trim().length < 2) return;
    setAnalyzing(true);
    try {
      const response = await fetch('/api/setu-guru/reply-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, replyText: replyText.trim() }),
      });
      const body = await response.json();
      if (response.ok) setAnalysis(body.analysis ?? null);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="border-b border-line bg-surface-2/60 p-4" aria-label="Revenue workspace">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <article className={cn(workspacePanelClass, 'p-4')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Revenue follow-up queue</p>
              <h3 className="mt-1 text-base font-medium text-content-primary">Quotes needing buyer action</h3>
            </div>
            <FileCheck2 className="h-5 w-5 text-brand-700" />
          </div>
          <div className="mt-4 space-y-2">
            {revenueActions.slice(0, 5).map((item) => (
              <Link key={item.id} href={item.action_href || '/quotes'} className="grid gap-3 rounded-card border border-line bg-surface-1 p-3 hover:bg-surface-2 sm:grid-cols-[1.4fr_.7fr_auto] sm:items-center">
                <div><p className="text-sm font-medium text-content-primary">{item.title}</p><p className="mt-1 text-xs text-content-muted">{item.reason}</p></div>
                <div><p className="text-caption uppercase text-content-muted">Quote</p><p className="mt-1 text-sm font-medium">{quoteLabel(item)}</p></div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">Review<ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
            {!revenueActions.length ? <p className="text-sm text-content-secondary">No quote follow-ups need attention right now.</p> : null}
          </div>
        </article>

        <div className="space-y-4">
          <article className={cn(workspacePanelClass, 'p-4')}>
            <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">Selected quote readiness</h3></div>
            {loading ? <p className="mt-3 flex items-center gap-2 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading readiness…</p> : null}
            {!loading && readiness ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Status</p><p className="mt-1 text-sm font-medium capitalize">{readiness.readinessLevel.replaceAll('_', ' ')}</p></div>
                  <div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Buyer quotes</p><p className="mt-1 text-sm font-medium">{readiness.existingQuotes.length}</p></div>
                </div>
                <Link href={`/leads/${readiness.leadId}/quote`} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center gap-2 rounded-ctl px-3 text-sm font-medium')}>Open quote workspace<ArrowRight className="h-4 w-4" /></Link>
              </div>
            ) : null}
            {!loading && !readiness ? <p className="mt-3 text-sm leading-6 text-content-secondary">Select a quote row to review its buyer context. The revenue queue remains available even when a quote is not linked to a lead record.</p> : null}
          </article>

          <article className={cn(workspacePanelClass, 'p-4')}>
            <div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">Reply analyzer</h3></div>
            <p className="mt-2 text-sm leading-6 text-content-secondary">Paste a buyer reply after selecting a linked quote.</p>
            <textarea className={cn(workspaceFieldSurfaceClass, 'mt-3 min-h-20 w-full rounded-ctl border p-3 text-sm')} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Paste buyer reply…" />
            <button type="button" onClick={analyze} disabled={!leadId || analyzing || replyText.trim().length < 2} className={cn(workspacePrimaryButtonClass, 'mt-3 inline-flex min-h-9 items-center gap-2 rounded-ctl px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50')}>{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Analyze reply</button>
            {analysis ? <div className="mt-3 rounded-card border border-line bg-surface-2 p-3"><p className="text-xs text-content-muted">{analysis.sentiment || 'Reviewed'} · {analysis.mainConcern || 'No primary concern identified'}</p><p className="mt-2 text-sm leading-6 text-content-secondary">{analysis.suggestedResponse || 'No response suggestion returned.'}</p></div> : null}
          </article>
        </div>
      </div>
    </section>
  );
}
