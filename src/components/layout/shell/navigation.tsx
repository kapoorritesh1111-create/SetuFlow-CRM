'use client';

import { useMemo } from 'react';
import { FaIcon } from '@/components/ui/fa-icon';
import type { NavSection } from '@/components/layout/shell/types';
import { getNavItemIcon, isNavItemActive, withWorkspaceMode } from '@/components/layout/shell/utils';
import { canonicalShellSections } from '@/lib/product-contract';
import { cn } from '@/lib/utils';

function filterSections(canAccessAdmin: boolean) {
  return canonicalShellSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessAdmin || !item.requiresAdmin) }))
    .filter((section) => section.items.length > 0) as NavSection[];
}

const PRIMARY_LABELS: Record<string, string> = {
  '/dashboard': 'Dash',
  '/leads': 'Leads',
  '/quotes': 'Quotes',
  '/orders': 'Orders',
  '/pipeline': 'Pipeline',
  '/products': 'Catalog',
};

const UTILITY_LABELS: Record<string, string> = {
  '/settings/lists': 'Settings',
  '/admin/organization': 'Admin',
};

export function ShellNavigation({ pathname, canAccessAdmin, workspaceMode, compact = false, onNavigate }: { pathname: string; canAccessAdmin: boolean; workspaceMode: 'all' | 'buyers' | 'suppliers'; compact?: boolean; onNavigate?: () => void }) {
  const sections = useMemo<NavSection[]>(() => filterSections(canAccessAdmin), [canAccessAdmin]);
  const items = useMemo(() => sections.flatMap((section) => section.items).filter((item, index, arr) => arr.findIndex((entry) => entry.href === item.href) === index), [sections]);
  const primaryItems = items.filter((item) => item.href in PRIMARY_LABELS).sort((a, b) => Object.keys(PRIMARY_LABELS).indexOf(a.href) - Object.keys(PRIMARY_LABELS).indexOf(b.href));
  const utilityItems = items.filter((item) => item.href in UTILITY_LABELS).sort((a, b) => Object.keys(UTILITY_LABELS).indexOf(a.href) - Object.keys(UTILITY_LABELS).indexOf(b.href));

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
                title={PRIMARY_LABELS[item.href]}
                className={cn(
                  'flex h-11 flex-col items-center justify-center rounded-[0.9rem] text-[9px] font-semibold uppercase tracking-[0.08em] transition',
                  active ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white',
                )}
              >
                <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                <span className="mt-1 normal-case tracking-normal text-[9px]">{PRIMARY_LABELS[item.href]}</span>
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
                  title={UTILITY_LABELS[item.href]}
                  className={cn(
                    'flex h-11 flex-col items-center justify-center rounded-[0.9rem] text-[9px] font-semibold uppercase tracking-[0.08em] transition',
                    active ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white',
                  )}
                >
                  <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                  <span className="mt-1 normal-case tracking-normal text-[8px]">{UTILITY_LABELS[item.href]}</span>
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
