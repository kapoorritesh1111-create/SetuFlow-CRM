'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, MessageSquareText, Sparkles, X } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { workspaceFieldSurfaceClass, workspaceInsetClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

type ReplyAnalysis = {
  summary: string;
  intent: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  missingInformation: string[];
  suggestedStage: string | null;
  suggestedResponse: string;
  recommendedFollowUp: string | null;
  quoteOrRfqAction: 'none' | 'create_quote' | 'create_rfq';
  notConfigured?: boolean;
};

export function ReplyAnalyzerLauncher({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReplyAnalysis | null>(null);

  async function handleAnalyze() {
    if (!replyText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/setu-guru/reply-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, replyText }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Setu Guru could not analyze this reply.');
      setAnalysis(body.analysis as ReplyAnalysis);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : 'Setu Guru could not analyze this reply.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3.5 text-sm font-semibold')}
      >
        <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        Analyze reply
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Setu Guru reply analyzer">
          <button type="button" aria-label="Close reply analyzer" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default" />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-panel border border-line bg-surface-1 shadow-hero">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <GuruAvatar size="md" />
                <div>
                  <p className="text-sm font-semibold text-content-primary">Reply Analyzer</p>
                  <p className="text-xs text-content-muted">Paste a buyer or supplier reply</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-ctl p-1.5 text-content-muted transition hover:bg-surface-2" aria-label="Close">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-4 p-5">
              <textarea
                className={cn(workspaceFieldSurfaceClass, 'min-h-28 w-full rounded-ctl border px-3 py-2 text-sm')}
                placeholder="Paste the reply text here…"
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !replyText.trim()}
                className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-ctl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60')}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                Analyze reply
              </button>

              {error ? <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">{error}</div> : null}

              {analysis?.notConfigured ? (
                <div className="rounded-card border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-fg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                    {analysis.summary}
                  </div>
                </div>
              ) : analysis ? (
                <div className="space-y-3">
                  <div className={cn(workspaceInsetClass, 'p-4')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={`Intent: ${analysis.intent}`} tone={analysis.intent === 'high' ? 'success' : analysis.intent === 'medium' ? 'info' : 'neutral'} />
                      <StatusBadge label={`Urgency: ${analysis.urgency}`} tone={analysis.urgency === 'high' ? 'danger' : analysis.urgency === 'medium' ? 'warning' : 'neutral'} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-content-secondary">{analysis.summary}</p>
                  </div>

                  {analysis.suggestedStage ? (
                    <div className={cn(workspaceInsetClass, 'p-4')}>
                      <p className="text-caption uppercase text-content-muted">Suggested stage</p>
                      <p className="mt-1 text-sm font-semibold text-content-primary">{analysis.suggestedStage}</p>
                      <p className="mt-1 text-xs text-content-muted">You apply this stage change from the lead record — Setu Guru does not change it automatically.</p>
                    </div>
                  ) : null}

                  {analysis.suggestedResponse ? (
                    <div className={cn(workspaceInsetClass, 'p-4')}>
                      <p className="text-caption uppercase text-content-muted">Suggested response</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-content-primary">{analysis.suggestedResponse}</p>
                    </div>
                  ) : null}

                  {analysis.missingInformation.length ? (
                    <div className="rounded-card border border-line bg-surface-2 px-4 py-3">
                      <p className="text-sm font-semibold text-content-primary">Missing information</p>
                      <p className="mt-1 text-sm text-content-secondary">{analysis.missingInformation.join(', ')}</p>
                    </div>
                  ) : null}

                  {analysis.quoteOrRfqAction !== 'none' ? (
                    <div className="rounded-card border border-brand-500/40 bg-accent-50 px-4 py-3">
                      <p className="text-sm font-semibold text-brand-700">
                        {analysis.quoteOrRfqAction === 'create_quote' ? 'Consider creating a quote.' : 'Consider creating an RFQ.'}
                      </p>
                      <Link href={`/leads/${leadId}`} className="mt-2 inline-flex text-sm font-semibold text-brand-700 underline">
                        Open this lead to continue
                      </Link>
                    </div>
                  ) : null}

                  {analysis.recommendedFollowUp ? (
                    <p className="text-xs text-content-muted">Suggested follow-up: {analysis.recommendedFollowUp}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
