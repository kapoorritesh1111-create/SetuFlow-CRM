'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  Loader2,
  MessageSquareText,
  PackageCheck,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

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
  country: string | null;
  products: string[];
  suggestedCurrency: string | null;
  moqNote: string | null;
  missingItems: string[];
  existingQuotes: Array<{ id: string; quote_number: string | null; status: string | null; sent_at: string | null }>;
  suggestedFollowUp: string | null;
  readinessLevel: 'ready' | 'needs_input' | 'no_quote_yet';
};

type ReplyAnalysis = {
  sentiment?: string;
  mainConcern?: string;
  suggestedResponse?: string;
  probabilityToOrder?: string;
  [key: string]: unknown;
};

type SupplierRow = {
  leadId: string;
  label: string;
  country: string | null;
  documentCompleteness: number;
  openRfqCount: number;
  respondedRfqCount: number;
  responseQuality: 'responsive' | 'slow' | 'no_data';
  compositeScore: number;
};

function readinessTone(level: QuoteReadiness['readinessLevel']) {
  if (level === 'ready') return 'text-success-fg';
  if (level === 'needs_input') return 'text-warning-fg';
  return 'text-info-fg';
}

export function RevenueWorkspace({ selected }: { selected: SetuGuruRecommendation | null }) {
  const leadId = selected?.entity_id ?? null;
  const [readiness, setReadiness] = useState<QuoteReadiness | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [analysis, setAnalysis] = useState<ReplyAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReadiness(null);
    setAnalysis(null);
    setError(null);
    if (!leadId) return;
    let cancelled = false;
    setLoadingReadiness(true);
    fetch(`/api/setu-guru/quote-readiness?leadId=${encodeURIComponent(leadId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || 'Could not load quote readiness.');
        if (!cancelled) setReadiness(body.readiness ?? null);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not load quote readiness.');
      })
      .finally(() => {
        if (!cancelled) setLoadingReadiness(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function analyze() {
    if (!leadId || replyText.trim().length < 2) return;
    setAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/setu-guru/reply-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, replyText: replyText.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Could not analyze the reply.');
      setAnalysis(body.analysis ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not analyze the reply.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="border-b border-line bg-surface-2/60 p-4" aria-label="Revenue workspace">
      <div className="grid gap-4 xl:grid-cols-2">
        <article className={cn(workspacePanelClass, 'p-4')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Quote readiness</p>
              <h3 className="mt-1 text-base font-medium text-content-primary">{readiness?.buyerLabel || selected?.title || 'Select a buyer or quote action'}</h3>
            </div>
            <FileCheck2 className="h-5 w-5 text-brand-700" />
          </div>
          {loadingReadiness ? <p className="mt-4 flex items-center gap-2 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading readiness…</p> : null}
          {!leadId ? <p className="mt-4 text-sm text-content-secondary">Choose a buyer, lead, or quote item to see verified quote readiness.</p> : null}
          {readiness ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Status</p><p className={cn('mt-1 text-sm font-medium capitalize', readinessTone(readiness.readinessLevel))}>{readiness.readinessLevel.replaceAll('_', ' ')}</p></div>
                <div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Currency</p><p className="mt-1 text-sm font-medium">{readiness.suggestedCurrency || 'Not set'}</p></div>
                <div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Quotes</p><p className="mt-1 text-sm font-medium">{readiness.existingQuotes.length}</p></div>
              </div>
              {readiness.missingItems.length ? (
                <div className="rounded-card border border-warning-border bg-warning-bg p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-warning-fg"><TriangleAlert className="h-4 w-4" />Needs input</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-content-secondary">{readiness.missingItems.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
              ) : <p className="flex items-center gap-2 text-sm text-success-fg"><CheckCircle2 className="h-4 w-4" />Core quote context is ready.</p>}
              {readiness.suggestedFollowUp ? <p className="text-sm text-content-secondary"><span className="font-medium">Follow-up:</span> {readiness.suggestedFollowUp}</p> : null}
              <Link href={`/leads/${readiness.leadId}/quote`} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-9 items-center gap-2 rounded-ctl px-4 text-sm font-medium')}>Open quote workspace<ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : null}
        </article>

        <article className={cn(workspacePanelClass, 'p-4')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Reply analyzer</p>
              <h3 className="mt-1 text-base font-medium text-content-primary">Understand the buyer response</h3>
            </div>
            <MessageSquareText className="h-5 w-5 text-brand-700" />
          </div>
          <textarea className={cn(workspaceFieldSurfaceClass, 'mt-4 min-h-24 w-full rounded-ctl border p-3 text-sm')} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Paste the buyer reply here…" />
          <button type="button" onClick={analyze} disabled={!leadId || analyzing || replyText.trim().length < 2} className={cn(workspacePrimaryButtonClass, 'mt-3 inline-flex min-h-9 items-center gap-2 rounded-ctl px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50')}>{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Analyze reply</button>
          {analysis ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Sentiment</p><p className="mt-1 text-sm font-medium">{String(analysis.sentiment || 'Reviewed')}</p></div>
              <div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Main concern</p><p className="mt-1 text-sm font-medium">{String(analysis.mainConcern || 'See suggested response')}</p></div>
              <div className={cn(workspaceInsetClass, 'p-3 sm:col-span-2')}><p className="text-caption uppercase text-content-muted">Suggested response</p><p className="mt-2 text-sm leading-6 text-content-secondary">{String(analysis.suggestedResponse || 'No response suggestion returned.')}</p></div>
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm text-danger-fg">{error}</p> : null}
        </article>
      </div>
    </section>
  );
}

export function SupplierWorkspace({ recommendations }: { recommendations: SetuGuruRecommendation[] }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/setu-guru/supplier-comparison', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || 'Could not compare suppliers.');
        if (!cancelled) setSuppliers(body.suppliers ?? []);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not compare suppliers.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const supplierActions = useMemo(() => recommendations.filter((item) => /supplier|rfq|compliance|document/i.test(`${item.entity_type} ${item.recommendation_type} ${item.title}`)), [recommendations]);
  const rfqCount = supplierActions.filter((item) => /rfq/i.test(`${item.recommendation_type} ${item.title}`)).length;
  const complianceCount = supplierActions.filter((item) => /compliance|document/i.test(`${item.recommendation_type} ${item.title}`)).length;

  return (
    <section className="border-b border-line bg-surface-2/60 p-4" aria-label="Supplier workspace">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <article className={cn(workspacePanelClass, 'p-4')}>
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium uppercase tracking-wide text-brand-700">Supplier comparison</p><h3 className="mt-1 text-base font-medium text-content-primary">Verified supplier readiness</h3></div>
            <Scale className="h-5 w-5 text-brand-700" />
          </div>
          {loading ? <p className="mt-4 flex items-center gap-2 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />Comparing suppliers…</p> : null}
          {error ? <p className="mt-4 text-sm text-danger-fg">{error}</p> : null}
          {!loading && !error ? (
            <div className="mt-4 space-y-2">
              {suppliers.slice(0, 5).map((supplier) => (
                <Link key={supplier.leadId} href={`/leads/${supplier.leadId}`} className="grid gap-3 rounded-card border border-line bg-surface-1 p-3 hover:bg-surface-2 sm:grid-cols-[1.4fr_.7fr_.7fr_auto] sm:items-center">
                  <div><p className="text-sm font-medium text-content-primary">{supplier.label}</p><p className="mt-1 text-xs text-content-muted">{supplier.country || 'Country not recorded'}</p></div>
                  <div><p className="text-caption uppercase text-content-muted">Documents</p><p className="mt-1 text-sm font-medium">{supplier.documentCompleteness}%</p></div>
                  <div><p className="text-caption uppercase text-content-muted">RFQs</p><p className="mt-1 text-sm font-medium">{supplier.respondedRfqCount} responded · {supplier.openRfqCount} open</p></div>
                  <div className="text-right"><span className="inline-flex rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success-fg">{supplier.compositeScore}% fit</span></div>
                </Link>
              ))}
              {!suppliers.length ? <p className="text-sm text-content-secondary">No supplier records are available for comparison yet.</p> : null}
            </div>
          ) : null}
        </article>

        <div className="space-y-4">
          <article className={cn(workspacePanelClass, 'p-4')}>
            <div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">RFQ assistant</h3></div>
            <p className="mt-2 text-sm leading-6 text-content-secondary">{rfqCount ? `${rfqCount} RFQ action${rfqCount === 1 ? '' : 's'} need attention.` : 'No RFQ exceptions need attention.'}</p>
            <Link href="/leads?type=supplier" className={cn(workspaceSecondaryButtonClass, 'mt-3 inline-flex min-h-9 items-center gap-2 rounded-ctl px-3 text-sm font-medium')}>Open supplier RFQs<Send className="h-4 w-4" /></Link>
          </article>
          <article className={cn(workspacePanelClass, 'p-4')}>
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">Compliance</h3></div>
            <p className="mt-2 text-sm leading-6 text-content-secondary">{complianceCount ? `${complianceCount} document or compliance gap${complianceCount === 1 ? '' : 's'} require review.` : 'No active compliance gaps detected.'}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-content-muted">{complianceCount ? <FileWarning className="h-4 w-4 text-warning-fg" /> : <FileCheck2 className="h-4 w-4 text-success-fg" />}Based only on records already stored in Setu Flow.</div>
          </article>
        </div>
      </div>
    </section>
  );
}
