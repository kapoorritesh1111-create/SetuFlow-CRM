'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileWarning, Loader2, Sparkles, Target, X, Link2 } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { workspaceInsetClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

type ResearchCitation = {
  marker: string;
  sourceType: string;
  sourceId: string;
};

type ResearchResult = {
  entityId: string;
  entityType: 'buyer' | 'supplier';
  label: string;
  fitSummary: string;
  fitScore: { score: number; reasons: string[] } | null;
  recommendedProducts: string[];
  suggestedAngle: string | null;
  missingInformation: string[];
  recommendedNextAction: string;
  suggestedFollowUpTiming: string | null;
  complianceStatus?: 'ok' | 'gaps_found' | 'unknown';
  missingDocuments?: string[];
  rfqReadiness?: 'ready' | 'needs_input' | 'unknown';
  citations?: ResearchCitation[];
};

export function ResearchDrawerLauncher({ leadId, leadType }: { leadId: string; leadType?: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);

  const isSupplier = String(leadType ?? '').toLowerCase() === 'supplier';

  useEffect(() => {
    if (!open || result || loading) return;
    setLoading(true);
    setError(null);
    const entityType = isSupplier ? 'supplier' : 'buyer';
    fetch(`/api/setu-guru/entity-research?leadId=${encodeURIComponent(leadId)}&entityType=${entityType}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setResult(body.result as ResearchResult);
      })
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : 'Setu Guru could not load research for this record.'))
      .finally(() => setLoading(false));
  }, [open, result, loading, leadId, isSupplier]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          workspaceSecondaryButtonClass,
          'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3.5 text-sm font-semibold',
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Setu Guru research
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label="Setu Guru research drawer">
          <button
            type="button"
            aria-label="Close research drawer"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface-1 shadow-hero">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <GuruAvatar size="md" />
                <div>
                  <p className="text-sm font-semibold text-content-primary">
                    {isSupplier ? 'Supplier research' : 'Buyer research'}
                  </p>
                  <p className="text-xs text-content-muted">Grounded in your CRM data only</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-ctl p-1.5 text-content-muted transition hover:bg-surface-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-4 p-5">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-content-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Setu Guru is reviewing this record…
                </div>
              ) : error ? (
                <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">{error}</div>
              ) : result ? (
                <>
                  <div className={cn(workspaceInsetClass, 'p-4')}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-content-primary">{isSupplier ? 'Supplier fit summary' : 'Buyer fit summary'}</p>
                      {result.fitScore ? (
                        <StatusBadge
                          label={`Fit ${result.fitScore.score}/100`}
                          tone={result.fitScore.score >= 65 ? 'success' : result.fitScore.score >= 40 ? 'info' : 'neutral'}
                        />
                      ) : (
                        <StatusBadge label="ICP not set up" tone="neutral" />
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-content-secondary">{result.fitSummary}</p>
                    {!result.fitScore ? (
                      <Link href="/growth-agent/icp" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
                        <Target className="h-4 w-4" aria-hidden="true" />
                        Set up your ICP
                      </Link>
                    ) : null}
                  </div>

                  {result.suggestedAngle ? (
                    <div className={cn(workspaceInsetClass, 'p-4')}>
                      <p className="text-caption uppercase text-content-muted">Suggested angle</p>
                      <p className="mt-1 text-sm leading-6 text-content-secondary">{result.suggestedAngle}</p>
                    </div>
                  ) : null}

                  {result.recommendedProducts.length ? (
                    <div className={cn(workspaceInsetClass, 'p-4')}>
                      <p className="text-caption uppercase text-content-muted">Recommended products</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {result.recommendedProducts.map((product) => (
                          <li key={product} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-content-secondary">
                            {product}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {isSupplier && result.complianceStatus === 'gaps_found' ? (
                    <div className="rounded-card border border-warning-border bg-warning-bg px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FileWarning className="mt-0.5 h-4 w-4 text-warning-fg" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-warning-fg">Missing documents</p>
                          <p className="mt-1 text-sm text-warning-fg">
                            {(result.missingDocuments ?? []).join(', ') || 'Required compliance documents are not on file.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {result.missingInformation.length ? (
                    <div className="rounded-card border border-line bg-surface-2 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-content-muted" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-content-primary">Missing information</p>
                          <p className="mt-1 text-sm text-content-secondary">{result.missingInformation.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className={cn(workspaceInsetClass, 'p-4')}>
                    <p className="text-caption uppercase text-content-muted">Recommended next step</p>
                    <p className="mt-1 text-sm font-medium text-content-primary">{result.recommendedNextAction}</p>
                    {result.suggestedFollowUpTiming ? (
                      <p className="mt-1 text-xs text-content-muted">Suggested timing: {result.suggestedFollowUpTiming}</p>
                    ) : null}
                  </div>

                  {result.citations && result.citations.length ? (
                    <div className={cn(workspaceInsetClass, 'p-4')}>
                      <p className="text-caption uppercase text-content-muted">Sources</p>
                      <ul className="mt-2 space-y-1.5">
                        {result.citations.map((citation) => (
                          <li key={citation.marker + citation.sourceId} className="flex items-center gap-2 text-xs text-content-secondary">
                            <Link2 className="h-3.5 w-3.5 shrink-0 text-content-muted" aria-hidden="true" />
                            <span className="font-mono font-semibold text-content-primary">{citation.marker}</span>
                            <span className="text-content-muted">{citation.sourceType}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <p className="text-xs text-content-muted">
                    Setu Guru only uses information already stored in this CRM record. Nothing here is sent or changed automatically —
                    review and act from the record itself.
                  </p>
                </>
              ) : null}
            </div>

            <div className="border-t border-line p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 w-full items-center justify-center rounded-ctl text-sm font-semibold')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
