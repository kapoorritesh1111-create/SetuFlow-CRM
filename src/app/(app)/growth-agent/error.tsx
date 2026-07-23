'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { workspacePanelClass, workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

export default function GrowthAgentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className={cn(workspacePanelClass, 'p-6')}>
      <div className="flex items-start gap-3">
        <div className="rounded-card bg-danger-bg p-2.5 text-danger-fg">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Setu Guru could not load the Growth Center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">
            Your CRM data was not changed. Try loading the organization-scoped recommendations again.
          </p>
          <button
            type="button"
            onClick={reset}
            className={cn(workspacePrimaryButtonClass, 'mt-4 inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-semibold')}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      </div>
    </section>
  );
}
