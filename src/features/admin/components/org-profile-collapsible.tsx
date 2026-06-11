import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';

type Section = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  badge: 'ok' | 'optional';
  children: ReactNode;
};

export function OrgProfileCollapsible({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-3" id="company-profile">
      {sections.map((section, index) => (
        <details key={section.id} open={index === 0} className="group overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm" aria-hidden="true">{section.icon}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-slate-950">{section.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-400">{section.subtitle}</span>
              </span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-2">
              <StatusBadge label={section.badge === 'ok' ? 'Configured' : 'Optional'} tone={section.badge === 'ok' ? 'success' : 'neutral'} dot={false} />
              <span className="text-xs text-slate-400 group-open:hidden" aria-hidden="true">▼</span>
              <span className="hidden text-xs text-slate-400 group-open:inline" aria-hidden="true">▲</span>
            </span>
          </summary>
          <div className="border-t border-slate-100 px-4 pb-4 pt-3.5">{section.children}</div>
        </details>
      ))}
    </div>
  );
}
