'use client';

import type { WorkspaceMode } from '../types';

const OPTIONS: Array<{ value: WorkspaceMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'buyers', label: 'Buyers' },
  { value: 'suppliers', label: 'Suppliers' },
];

export function WorkspaceModeSwitch({ value, onChange }: { value: WorkspaceMode; onChange: (value: WorkspaceMode) => void }) {
  return (
    <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Workspace mode">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'rounded-xl px-3.5 py-2 text-sm font-semibold transition',
              active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
