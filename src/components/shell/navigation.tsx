'use client';

import { useMemo } from 'react';
import { FaIcon } from '@/components/ui/fa-icon';
import type { ProductNavSection } from '@/lib/product-contract';
import { getNavItemIcon, isNavItemActive, withWorkspaceMode } from '@/components/shell/utils';
import {
  filterShellSections,
  getPrimaryShellNavItems,
  getUtilityShellNavItems,
  PRIMARY_NAV_LABELS,
  UTILITY_NAV_LABELS,
} from '@/lib/navigation/nav-items';
import { cn } from '@/lib/utils';

export function ShellNavigation({ pathname, canAccessAdmin, workspaceMode, compact = false, onNavigate }: { pathname: string; canAccessAdmin: boolean; workspaceMode: 'all' | 'buyers' | 'suppliers'; compact?: boolean; onNavigate?: () => void }) {
  const sections = useMemo<ProductNavSection[]>(() => filterShellSections(canAccessAdmin), [canAccessAdmin]);
  const items = useMemo(() => sections.flatMap((section) => section.items).filter((item, index, arr) => arr.findIndex((entry) => entry.href === item.href) === index), [sections]);
  const primaryItems = useMemo(() => getPrimaryShellNavItems(sections), [sections]);
  const utilityItems = useMemo(() => getUtilityShellNavItems(sections), [sections]);

  if (compact) {
    return (
      <div className="flex h-full flex-col">
        <nav className="space-y-2" aria-label="Primary navigation">
          {primaryItems.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <a
                key={item.href}
                href={withWorkspaceMode(item.href, workspaceMode)}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={PRIMARY_NAV_LABELS[item.href]}
                className={cn(
                  'flex h-11 flex-col items-center justify-center rounded-[0.9rem] text-[9px] font-semibold uppercase tracking-[0.08em] transition',
                  active ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white',
                )}
              >
                <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                <span className="mt-1 normal-case tracking-normal text-[9px]">{PRIMARY_NAV_LABELS[item.href]}</span>
              </a>
            );
          })}
        </nav>

        {utilityItems.length ? (
          <nav className="mt-auto space-y-2 pt-6" aria-label="Workspace utilities">
            {utilityItems.map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <a
                  key={item.href}
                  href={withWorkspaceMode(item.href, workspaceMode)}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  title={UTILITY_NAV_LABELS[item.href]}
                  className={cn(
                    'flex h-11 flex-col items-center justify-center rounded-[0.9rem] text-[9px] font-semibold uppercase tracking-[0.08em] transition',
                    active ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white',
                  )}
                >
                  <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                  <span className="mt-1 normal-case tracking-normal text-[8px]">{UTILITY_NAV_LABELS[item.href]}</span>
                </a>
              );
            })}
          </nav>
        ) : null}
      </div>
    );
  }

  return (
    <nav className="space-y-2" aria-label="Primary navigation">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);
        return (
          <a key={item.href} href={withWorkspaceMode(item.href, workspaceMode)} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={cn('flex items-center justify-between rounded-[1rem] px-4 py-3 text-sm font-medium transition', active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
            <span className="flex items-center gap-3"><FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
