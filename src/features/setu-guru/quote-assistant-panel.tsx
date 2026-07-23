'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, Loader2, X } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { workspaceInsetClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
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

export function QuoteAssistantLauncher({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<QuoteReadiness | null>(null);

  useEffect(() => {
    if (!open || readiness || loading) return;
    setLoading(true);
    setError(null);
    fetch(`/api/setu-guru/quote-readiness?leadId=${encodeURIComponent(leadId)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setReadiness(body.readiness as QuoteReadiness);
      })
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : 'Setu Guru could not load quote readiness.'))
      .finally(() => setLoading(false));
  }, [open, readiness, loading, leadId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3.5 text-sm font-semibold')}
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        Quote readiness
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label="Setu Guru quote readiness">
          <button type="button" aria-label="Close quote readiness panel" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default" />
          <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface-1 shadow-hero">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <GuruAvatar size="md" />
                <div>
                  <p className="text-sm font-semibold text-content-primary">Quote readiness</p>
                  <p className="text-xs text-content-muted">Context only — pricing happens in the quote builder</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-ctl p-1.5 text-content-muted transition hover:bg-surface-2" aria-label="Close">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-4 p-5">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-content-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Checking quote readiness…
                </div>
              ) : error ? (
                <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">{error}</div>
              ) : readiness ? (
                <>
                  <div className={cn(workspaceInsetClass, 'p-4')}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-content-primary">{readiness.buyerLabel}</p>
                      <StatusBadge
                        label={readiness.readinessLevel === 'ready' ? 'Ready' : readiness.readinessLevel === 'needs_input' ? 'Needs input' : 'No quote yet'}
                        tone={readiness.readinessLevel === 'ready' ? 'success' : readiness.readinessLevel === 'needs_input' ? 'warning' : 'info'}
                      />
                    </div>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-content-muted">Country</dt>
                        <dd className="font-medium text-content-primary">{readiness.country || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-content-muted">Products</dt>
                        <dd className="text-right font-medium text-content-primary">{readiness.products.join(', ') || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-content-muted">Currency</dt>
                        <dd className="font-medium text-content-primary">{readiness.suggestedCurrency || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-content-muted">MOQ note</dt>
                        <dd className="text-right font-medium text-content-primary">{readiness.moqNote || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  {readiness.missingItems.length ? (
                    <div className="rounded-card border border-warning-border bg-warning-bg px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-fg" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-warning-fg">Missing before quoting</p>
                          <ul className="mt-1 list-inside list-disc text-sm text-warning-fg">
                            {readiness.missingItems.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {readiness.existingQuotes.length ? (
                    <div className={cn(workspaceInsetClass, 'p-4')}>
                      <p className="text-caption uppercase text-content-muted">Existing quotes</p>
                      <div className="mt-2 space-y-2">
                        {readiness.existingQuotes.slice(0, 5).map((quote) => (
                          <div key={quote.id} className="flex items-center justify-between text-sm">
                            <span className="text-content-primary">{quote.quote_number || 'Draft quote'}</span>
                            <StatusBadge label={quote.status || 'unknown'} tone="neutral" />
                          </div>
                        ))}
                      </div>
                      {readiness.suggestedFollowUp ? (
                        <p className="mt-2 text-xs text-content-muted">{readiness.suggestedFollowUp}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <Link
                    href={`/leads/${readiness.leadId}/quote`}
                    className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-ctl text-sm font-semibold')}
                  >
                    Continue to quote builder
                  </Link>
                  <p className="text-xs text-content-muted">
                    Setu Guru does not set prices or create quotes here — you build and approve the quote in the quote builder.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
