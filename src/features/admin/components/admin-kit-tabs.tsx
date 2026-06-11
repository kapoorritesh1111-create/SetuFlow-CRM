'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * S24-ADMUX-21 — Admin UX V2 tabs (.tabs/.tab/.tbadge from the design contract).
 * Used by merged admin pages (Members & Roles, Catalog, Catalog Governance).
 * All tab panels stay mounted so server-rendered forms and their actions keep working.
 */
export type KitTabItem = {
  key: string;
  label: string;
  badge?: string | number;
  content: ReactNode;
};

export function KitTabs({ items, initialTab }: { items: KitTabItem[]; initialTab?: string }) {
  const fallback = items[0]?.key ?? '';
  const initial = initialTab && items.some((item) => item.key === initialTab) ? initialTab : fallback;
  const [active, setActive] = useState(initial);

  return (
    <div>
      <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(item.key)}
              className={cn(
                'whitespace-nowrap border-b-[2.5px] px-3.5 py-2 text-xs transition',
                isActive
                  ? 'border-[#1F487C] font-bold text-[#1F487C]'
                  : 'border-transparent font-semibold text-slate-500 hover:text-slate-800',
              )}
            >
              {item.label}
              {item.badge !== undefined && item.badge !== null && String(item.badge) !== '0' ? (
                <span className="ml-1 rounded-md bg-amber-50 px-1 py-px text-[8px] font-bold text-amber-700">{item.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div key={item.key} role="tabpanel" hidden={item.key !== active}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
