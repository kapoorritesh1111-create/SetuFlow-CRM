import Link from 'next/link';
import { workspaceHeroClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type WorkspaceStateProps = {
  title: string;
  description: string;
  eyebrow?: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
};

export function WorkspaceState({
  title,
  description,
  eyebrow = 'Workspace state',
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel,
  secondaryActionHref,
}: WorkspaceStateProps) {
  return (
    <div className={`flex min-h-[320px] items-center justify-center p-8 text-center ${workspaceHeroClass}`}>
      <div className="max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-gradient-to-br from-brand-50 via-white to-slate-100 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:from-sky-500/20 dark:via-slate-900 dark:to-slate-800 dark:text-sky-300">
          <span className="text-lg">✦</span>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-sky-300">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[2rem]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[15px]">{description}</p>

        {(primaryActionHref || secondaryActionHref) ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {primaryActionHref && primaryActionLabel ? (
              <Link
                href={primaryActionHref}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${workspacePrimaryButtonClass}`}
              >
                {primaryActionLabel}
              </Link>
            ) : null}

            {secondaryActionHref && secondaryActionLabel ? (
              <Link
                href={secondaryActionHref}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium ${workspaceSecondaryButtonClass}`}
              >
                {secondaryActionLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
