import type { ReactNode } from 'react';

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-slate-600">
      <span className="mb-2 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
