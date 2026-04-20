'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaIcon } from '@/components/ui/fa-icon';
import type { NavSection } from '@/components/layout/shell/types';
import { getNavItemIcon, getSectionIcon, isNavItemActive, withWorkspaceMode } from '@/components/layout/shell/utils';
import { canonicalShellSections } from '@/lib/product-contract';
import { cn } from '@/lib/utils';

export function ShellNavigation({
  pathname,
  canAccessAdmin,
  workspaceMode,
  compact = false,
  onNavigate,
}: {
  pathname: string;
  canAccessAdmin: boolean;
  workspaceMode: 'all' | 'buyers' | 'suppliers';
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const sections = useMemo<NavSection[]>(() => {
    return canonicalShellSections.filter((section) => canAccessAdmin || section.id !== 'admin') as NavSection[];
  }, [canAccessAdmin]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      sections.map((section) => [
        section.id,
        compact ? section.items.some((item) => isNavItemActive(pathname, item)) : true,
      ]),
    ),
  );

  useEffect(() => {
    setExpandedSections((current) => {
      const next = { ...current };
      sections.forEach((section) => {
        if (!(section.id in next)) {
          next[section.id] = compact ? section.items.some((item) => isNavItemActive(pathname, item)) : true;
        }
        if (section.items.some((item) => isNavItemActive(pathname, item))) {
          next[section.id] = true;
        }
      });
      return next;
    });
  }, [compact, pathname, sections]);

  return (
    <nav className={cn('mt-6', compact ? 'space-y-3' : 'space-y-4')} aria-label="Primary navigation">
      {sections.map((section) => {
        const isExpanded = expandedSections[section.id] ?? true;
        return (
          <div key={section.id} className="rounded-[1.6rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,252,0.96))] p-2 shadow-[0_18px_38px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03]">
            <button
              type="button"
              onClick={() => setExpandedSections((current) => ({ ...current, [section.id]: !isExpanded }))}
              className={cn(
                'flex w-full items-center rounded-[1.2rem] px-3 py-2 text-left transition duration-200 hover:bg-white/80',
                compact ? 'justify-center' : 'justify-between gap-3',
              )}
              aria-expanded={isExpanded}
            >
              <div className={cn('flex items-center gap-3', compact ? 'justify-center' : '')}>
                <span className="flex h-9 w-9 items-center justify-center rounded-[1rem] border border-white/90 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),rgba(224,231,255,0.98)_42%,rgba(191,219,254,0.92)_78%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(237,242,250,0.95))] text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_28px_rgba(15,23,42,0.12)]">
                  <FaIcon icon={getSectionIcon(section.icon)} fixedWidth className="text-sm" />
                </span>
                {!compact ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</p> : null}
              </div>
              {!compact ? <FaIcon icon={isExpanded ? 'minus' : 'plus'} fixedWidth className="text-xs text-slate-400" /> : null}
            </button>

            {isExpanded ? (
              <div className={cn('mt-2 space-y-1.5', compact ? 'px-0' : 'px-1')}>
                {section.items.map((item) => {
                  const active = isNavItemActive(pathname, item);
                  return (
                    <a
                      key={item.href}
                      href={withWorkspaceMode(item.href, workspaceMode)}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      title={compact ? item.label : undefined}
                      className={cn(
                        'group flex items-center rounded-[1.2rem] text-sm font-medium transition focus:outline-none',
                        compact ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3',
                        active
                          ? 'bg-[linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] ring-1 ring-white/10'
                          : 'text-slate-600 hover:bg-white/85 hover:text-slate-900',
                      )}
                    >
                      {compact ? (
                        <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                      ) : (
                        <>
                          <span className="flex items-center gap-3">
                            <span
                              className={cn(
                                'inline-flex h-8 w-8 items-center justify-center rounded-xl border transition',
                                active
                                  ? 'border-white/15 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_38%,rgba(255,255,255,0.04)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                                  : 'border-white/90 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),rgba(219,234,254,0.98)_44%,rgba(191,219,254,0.92)_82%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_26px_rgba(15,23,42,0.08)] group-hover:border-sky-200 group-hover:text-slate-900',
                              )}
                            >
                              <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                            </span>
                            <span>{item.label}</span>
                          </span>
                          <FaIcon icon="angle-right" fixedWidth className={cn('text-xs transition', active ? 'text-white/70' : 'text-slate-300 group-hover:text-slate-500')} />
                        </>
                      )}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
