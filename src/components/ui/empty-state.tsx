// SF-19-023: Enhanced empty state component with SVG icons
import Link from 'next/link';
import { workspaceHeroClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

const EMPTY_ICONS: Record<string, string> = {
  leads:    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  orders:   'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  quotes:   'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  tasks:    'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  products: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  search:   'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35',
  events:   'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM8 7h8M8 11h8M8 15h4',
  default:  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
};

type EmptyStateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: keyof typeof EMPTY_ICONS;
  secondaryAction?: { label: string; href: string };
};

export function EmptyState({ title, description, actionHref, actionLabel, icon = 'default', secondaryAction }: EmptyStateProps) {
  const iconPath = EMPTY_ICONS[icon] ?? EMPTY_ICONS.default;
  return (
    <div className={`${workspaceHeroClass} border-dashed px-6 py-12 text-center sm:px-8`}>
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-panel bg-gradient-to-br from-brand-50 via-white to-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 dark:from-sky-500/20 dark:via-slate-900 dark:to-slate-800"
        aria-hidden="true"
      >
        <svg
          width="28" height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand-500 dark:text-sky-400"
        >
          <path d={iconPath} />
        </svg>
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-[15px]">{description}</p>
      ) : null}
      {(actionHref && actionLabel) || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${workspaceSecondaryButtonClass}`}
            >
              {actionLabel}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
