'use client';

import Link from 'next/link';
import type { WorkspaceQuickAction } from '../types';

function getToneClasses(tone: WorkspaceQuickAction['tone']) {
  if (tone === 'primary') return 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800';
  if (tone === 'ghost') return 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100';
  return 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
}

export function QuickActionCluster({ actions }: { actions: WorkspaceQuickAction[] }) {
  if (!actions.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const className = ['inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition', getToneClasses(action.tone)].join(' ');
        if (action.href) {
          return <Link key={action.id} href={action.href} className={className}>{action.label}</Link>;
        }
        return (
          <button key={action.id} type="button" onClick={action.onClick} disabled={action.disabled} className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}>
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
