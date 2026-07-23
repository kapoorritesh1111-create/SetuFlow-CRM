'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';

function tone(priority: SetuGuruRecommendation['priority']): StatusTone {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'medium') return 'info';
  return 'neutral';
}

export function SetuGuruDashboardPopover({
  recommendations,
  totalOpen,
  urgentCount,
  importantCount,
}: {
  recommendations: SetuGuruRecommendation[];
  totalOpen: number;
  urgentCount: number;
  importantCount: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3 text-left shadow-sm transition hover:border-brand-200 hover:bg-brand-50/30"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <GuruAvatar size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Setu Guru
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-content-primary">
              {totalOpen ? `${totalOpen} actions need attention` : 'No urgent actions right now'}
            </span>
            {totalOpen ? (
              <span className="mt-1 block text-xs text-content-muted">
                {urgentCount} urgent · {importantCount} important
              </span>
            ) : null}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700">
          View top 3
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 sm:items-start sm:p-6" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="setu-guru-dashboard-dialog-title"
            className="max-h-[86vh] w-full overflow-y-auto rounded-t-[24px] bg-surface-1 p-4 shadow-2xl sm:mt-16 sm:max-w-2xl sm:rounded-[24px] sm:p-5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <GuruAvatar size="md" />
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Setu Guru
                  </p>
                  <h2 id="setu-guru-dashboard-dialog-title" className="mt-1 text-lg font-semibold text-content-primary">
                    Top actions needing attention
                  </h2>
                  <p className="mt-1 text-sm text-content-secondary">Three different actions selected from your current CRM workload.</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-content-muted hover:bg-surface-2" aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {recommendations.length ? recommendations.map((recommendation) => (
                <article key={recommendation.id} className="rounded-card border border-line bg-surface-2/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-content-primary">{recommendation.title}</h3>
                    <StatusBadge label={recommendation.priority} tone={tone(recommendation.priority)} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-content-secondary">{recommendation.reason}</p>
                  <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-content-primary">{recommendation.recommended_action}</p>
                    <Link
                      href={recommendation.action_href || '/growth-agent'}
                      onClick={() => setOpen(false)}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-ctl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                    >
                      Open record
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )) : (
                <div className="rounded-card border border-line bg-surface-2 p-4 text-sm text-content-secondary">No open recommendations are available.</div>
              )}
            </div>

            <div className="mt-5 flex justify-end border-t border-line pt-4">
              <Link href="/growth-agent" onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl border border-line bg-surface-1 px-4 text-sm font-semibold text-content-primary hover:bg-surface-2">
                View all {totalOpen}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
