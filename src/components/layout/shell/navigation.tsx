'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaIcon } from '@/components/ui/fa-icon';
import type { NavSection } from '@/components/layout/shell/types';
import { getNavItemIcon, getSectionIcon, isNavItemActive, withWorkspaceMode } from '@/components/layout/shell/utils';
import { canonicalShellSections } from '@/lib/product-contract';
import { cn } from '@/lib/utils';

function filterSections(canAccessAdmin: boolean) {
  return canonicalShellSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessAdmin || !item.requiresAdmin),
    }))
    .filter((section) => section.items.length > 0) as NavSection[];
}

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
  const sections = useMemo<NavSection[]>(() => filterSections(canAccessAdmin), [canAccessAdmin]);

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
        const sectionTone = section.tone ?? 'support';

        return (
          <div
            key={section.id}
            className={cn(
              'rounded-[1.6rem] border p-2 shadow-[0_18px_38px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03]',
              sectionTone === 'primary'
                ? 'border-sky-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(239,246,255,0.98))]'
                : sectionTone === 'utility'
                  ? 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))]'
                  : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,252,0.96))]',
            )}
          >
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
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-[1rem] border text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_28px_rgba(15,23,42,0.12)]',
                    sectionTone === 'primary'
                      ? 'border-sky-100 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),rgba(219,234,254,0.98)_42%,rgba(125,211,252,0.9)_80%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.95))] text-sky-700'
                      : 'border-white/90 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),rgba(224,231,255,0.98)_42%,rgba(191,219,254,0.92)_78%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(237,242,250,0.95))] text-slate-700',
                  )}
                >
                  <FaIcon icon={getSectionIcon(section.icon)} fixedWidth className="text-sm" />
                </span>
                {!compact ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>
                    {section.description ? <p className="mt-1 text-xs leading-5 text-slate-500">{section.description}</p> : null}
                  </div>
                ) : null}
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
                        'group flex items-center rounded-[1.2rem] transition focus:outline-none',
                        compact
                          ? 'justify-center px-2 py-3'
                          : sectionTone === 'utility'
                            ? 'justify-between px-4 py-3 text-sm font-medium'
                            : 'justify-between px-4 py-3.5 text-sm font-medium',
                        active
                          ? 'bg-[linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] ring-1 ring-white/10'
                          : sectionTone === 'utility'
                            ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            : 'text-slate-600 hover:bg-white/85 hover:text-slate-900',
                      )}
                    >
                      {compact ? (
                        <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                      ) : (
                        <>
                          <span className="flex min-w-0 items-start gap-3">
                            <span
                              className={cn(
                                'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition',
                                active
                                  ? 'border-white/15 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_38%,rgba(255,255,255,0.04)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                                  : 'border-white/90 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),rgba(219,234,254,0.98)_44%,rgba(191,219,254,0.92)_82%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_26px_rgba(15,23,42,0.08)] group-hover:border-sky-200 group-hover:text-slate-900',
                              )}
                            >
                              <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate">{item.label}</span>
                              {item.description ? (
                                <span className={cn('mt-1 block leading-5', active ? 'text-white/75' : 'text-slate-500')}>
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <FaIcon icon="angle-right" fixedWidth className={cn('mt-0.5 text-xs transition', active ? 'text-white/70' : 'text-slate-300 group-hover:text-slate-500')} />
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
