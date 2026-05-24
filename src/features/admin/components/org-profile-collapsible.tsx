'use client';

import { useState, type ReactNode } from 'react';
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
  const [open, setOpen] = useState<string | null>(sections[0]?.id ?? null);

  return (
    <div className="space-y-3" id="company-profile">
      {sections.map((section) => {
        const isOpen = open === section.id;
        return (
          <section key={section.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.07)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
              onClick={() => setOpen(isOpen ? null : section.id)}
              aria-expanded={isOpen}
              aria-controls={`org-profile-section-${section.id}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-xl" aria-hidden="true">{section.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{section.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">{section.subtitle}</span>
                </span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-2">
                <StatusBadge label={section.badge === 'ok' ? 'Configured' : 'Optional'} tone={section.badge === 'ok' ? 'success' : 'neutral'} dot={false} />
                <span className="text-xs text-slate-400" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
              </span>
            </button>
            {isOpen ? <div id={`org-profile-section-${section.id}`} className="border-t border-slate-100 px-5 pb-5 pt-4">{section.children}</div> : null}
          </section>
        );
      })}
    </div>
  );
}
