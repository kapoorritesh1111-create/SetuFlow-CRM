import Link from 'next/link';
import { PackageCheck } from 'lucide-react';

import { StatusBadge } from '@/components/ui/status-badge';
import { workspaceHeroClass, workspaceInsetClass, workspacePanelClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { GuruAvatar } from '@/components/ui/guru-avatar';
import type { SupplierComparisonRow } from '@/lib/setu-guru/supplier-comparison';
import { cn } from '@/lib/utils';

export function SupplierComparisonTable({ suppliers }: { suppliers: SupplierComparisonRow[] }) {
  return (
    <main className="space-y-5 pb-10">
      <section className={workspaceHeroClass}>
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-start gap-4">
            <GuruAvatar size="lg" />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-accent-700">
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                Setu Guru
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">Supplier comparison</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">
                Ranked on document completeness and RFQ responsiveness — the criteria Setu Flow actually tracks today.
                Price and lead time are not yet captured as structured fields, so they are left out rather than guessed.
              </p>
            </div>
          </div>
          <Link
            href="/growth-agent"
            className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}
          >
            Back to Growth Center
          </Link>
        </div>
      </section>

      <section className={cn(workspacePanelClass, 'p-5 lg:p-6')}>
        {suppliers.length ? (
          <div className="space-y-3">
            {suppliers.map((supplier, index) => (
              <Link
                key={supplier.leadId}
                href={`/leads/${supplier.leadId}`}
                className={cn(workspaceInsetClass, 'flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-card')}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-content-secondary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content-primary">{supplier.label}</p>
                    <p className="mt-0.5 text-xs text-content-muted">
                      {supplier.country || 'Country not set'} · {supplier.documentCompleteness}% docs on file ·{' '}
                      {supplier.respondedRfqCount}/{supplier.respondedRfqCount + supplier.openRfqCount} RFQs closed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={supplier.responseQuality === 'responsive' ? 'Responsive' : supplier.responseQuality === 'slow' ? 'Slow to respond' : 'No RFQ history'}
                    tone={supplier.responseQuality === 'responsive' ? 'success' : supplier.responseQuality === 'slow' ? 'warning' : 'neutral'}
                  />
                  <StatusBadge label={`Score ${supplier.compositeScore}`} tone="info" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={cn(workspaceInsetClass, 'p-6 text-center')}>
            <p className="text-sm font-semibold text-content-primary">No supplier leads yet</p>
            <p className="mt-1 text-sm text-content-secondary">Add supplier leads to see them ranked here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
