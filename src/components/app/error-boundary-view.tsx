'use client';

import Link from 'next/link';
import { workspaceHeroClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

export function ErrorBoundaryView({
  title = 'Something went wrong',
  description = 'SETU Flow hit an unexpected issue while loading this screen. Try again or return to a stable route.',
  reset,
  homeHref = '/dashboard',
  homeLabel = 'Go to dashboard',
}: {
  title?: string;
  description?: string;
  reset?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 py-10">
      <div className={`w-full max-w-2xl ${workspaceHeroClass} border-rose-200/90 p-8 dark:border-rose-900/60`}>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">Application error</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {reset ? (
            <button type="button" onClick={reset} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${workspacePrimaryButtonClass}`}>
              Try again
            </button>
          ) : null}
          <Link href={homeHref} className={`rounded-2xl px-4 py-2 text-sm font-medium ${workspaceSecondaryButtonClass}`}>
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
