'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FaIcon } from '@/components/ui/fa-icon';
import { WidgetEmptyState } from '@/components/ui/widget-shell';
import { cn } from '@/lib/utils';

type WidgetSpan = 'compact' | 'standard' | 'wide' | 'hero';

export type DashboardLayoutPreset = {
  widgetOrder?: string[];
  widgetSpans?: Record<string, WidgetSpan>;
  hiddenWidgetIds?: string[];
};

type LayoutPreferenceState = {
  version: 1;
  widgetOrder: string[];
  widgetSpans: Record<string, WidgetSpan>;
  hiddenWidgetIds: string[];
};

export type DashboardWidgetSection = {
  id: string;
  title: string;
  description: string;
  eyebrow?: string;
};

export type DashboardWidgetDefinition = {
  id: string;
  sectionId?: string;
  title: string;
  description?: string;
  defaultSpan?: WidgetSpan;
  minSpan?: WidgetSpan;
  maxSpan?: WidgetSpan;
  render: () => ReactNode;
};

const spanOrder: WidgetSpan[] = ['compact', 'standard', 'wide', 'hero'];
const STORAGE_KEY_PREFIX = 'setuflow::dashboard-layout::';

const spanClassMap: Record<WidgetSpan, string> = {
  compact: 'xl:col-span-4 2xl:col-span-3',
  standard: 'xl:col-span-6 2xl:col-span-4',
  wide: 'xl:col-span-8 2xl:col-span-6',
  hero: 'xl:col-span-12 2xl:col-span-8',
};

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn('h-4 w-4', className)}>
      {children}
    </svg>
  );
}

function ChevronIcon({ open = false, className }: { open?: boolean; className?: string }) {
  return (
    <IconBase className={cn('transition-transform', open ? 'rotate-90' : '', className)}>
      <path d="M7 4.5 12.5 10 7 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function LayoutIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="2.5" y="3" width="15" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 3.8v12.4M12.6 8.5h4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </IconBase>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="3" width="5" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="3" width="5" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="5" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="5" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
    </IconBase>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 10a6 6 0 1 1-1.9-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 4.5v3.8h-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 10c1.9-3 4.4-4.5 7-4.5 2.7 0 5.1 1.5 7 4.5-1.9 3-4.3 4.5-7 4.5-2.6 0-5.1-1.5-7-4.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.8 3.8 17.2 16.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </IconBase>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M10 15V5M10 5 6 9M10 5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M10 5v10M10 15l-4-4M10 15l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function ShrinkIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M8 8 4.5 4.5M12 8l3.5-3.5M8 12l-3.5 3.5M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 4.5H4.5V7M13 4.5h2.5V7M7 15.5H4.5V13M13 15.5h2.5V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7.5 7.5 4.5 4.5M12.5 7.5l3-3M7.5 12.5l-3 3M12.5 12.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.5 7V4.5H7M15.5 7V4.5H13M4.5 13v2.5H7M15.5 13v2.5H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function ActionIconButton({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'default',
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-35',
        tone === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,252,0.98))] text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.07)] hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/70 hover:text-brand-700',
      )}
    >
      {icon}
    </button>
  );
}

function clampSpan(value: WidgetSpan, minSpan: WidgetSpan, maxSpan: WidgetSpan) {
  const minIndex = spanOrder.indexOf(minSpan);
  const maxIndex = spanOrder.indexOf(maxSpan);
  const valueIndex = spanOrder.indexOf(value);
  return spanOrder[Math.min(maxIndex, Math.max(minIndex, valueIndex))];
}

function getNextSpan(current: WidgetSpan, direction: -1 | 1, minSpan: WidgetSpan, maxSpan: WidgetSpan) {
  const currentIndex = spanOrder.indexOf(current);
  const nextIndex = currentIndex + direction;
  const bounded = spanOrder[Math.min(spanOrder.length - 1, Math.max(0, nextIndex))];
  return clampSpan(bounded, minSpan, maxSpan);
}

function moveItem<T>(items: T[], fromIndex: number, direction: -1 | 1) {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function moveItemTo<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return items;
  if (fromIndex === toIndex) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function toSpanLabel(value: WidgetSpan) {
  switch (value) {
    case 'compact':
      return 'Compact';
    case 'standard':
      return 'Standard';
    case 'wide':
      return 'Wide';
    case 'hero':
      return 'Hero';
    default:
      return value;
  }
}

function getDefaultLayoutState(widgets: DashboardWidgetDefinition[], preset?: DashboardLayoutPreset): LayoutPreferenceState {
  const knownIds = new Set(widgets.map((widget) => widget.id));
  const presetOrder = (preset?.widgetOrder ?? []).filter((id): id is string => typeof id === 'string' && knownIds.has(id));
  const orderedIds = [...presetOrder, ...widgets.map((widget) => widget.id).filter((id) => !presetOrder.includes(id))];

  const widgetSpans = Object.fromEntries(widgets.map((widget) => [widget.id, widget.defaultSpan ?? 'standard'])) as Record<string, WidgetSpan>;
  if (preset?.widgetSpans) {
    for (const [widgetId, span] of Object.entries(preset.widgetSpans)) {
      if (!knownIds.has(widgetId) || !spanOrder.includes(span as WidgetSpan)) continue;
      const widget = widgets.find((item) => item.id === widgetId);
      if (!widget) continue;
      widgetSpans[widgetId] = clampSpan(span as WidgetSpan, widget.minSpan ?? 'compact', widget.maxSpan ?? 'hero');
    }
  }

  const hiddenWidgetIds = (preset?.hiddenWidgetIds ?? []).filter((id): id is string => typeof id === 'string' && knownIds.has(id));

  return {
    version: 1,
    widgetOrder: orderedIds,
    widgetSpans,
    hiddenWidgetIds,
  };
}

function normalizeLayoutState(raw: unknown, widgets: DashboardWidgetDefinition[], preset?: DashboardLayoutPreset): LayoutPreferenceState {
  const defaults = getDefaultLayoutState(widgets, preset);
  if (!raw || typeof raw !== 'object') return defaults;

  const input = raw as Partial<LayoutPreferenceState>;
  const knownIds = new Set(widgets.map((widget) => widget.id));
  const orderedKnownIds = Array.isArray(input.widgetOrder)
    ? input.widgetOrder.filter((id): id is string => typeof id === 'string' && knownIds.has(id))
    : [];
  const missingIds = widgets.map((widget) => widget.id).filter((id) => !orderedKnownIds.includes(id));

  const widgetSpans = { ...defaults.widgetSpans };
  if (input.widgetSpans && typeof input.widgetSpans === 'object') {
    for (const [widgetId, span] of Object.entries(input.widgetSpans)) {
      if (!knownIds.has(widgetId) || !spanOrder.includes(span as WidgetSpan)) continue;
      const widget = widgets.find((item) => item.id === widgetId);
      if (!widget) continue;
      widgetSpans[widgetId] = clampSpan(span as WidgetSpan, widget.minSpan ?? 'compact', widget.maxSpan ?? 'hero');
    }
  }

  const hiddenWidgetIds = Array.isArray(input.hiddenWidgetIds)
    ? input.hiddenWidgetIds.filter((id): id is string => typeof id === 'string' && knownIds.has(id))
    : [];

  return {
    version: 1,
    widgetOrder: [...orderedKnownIds, ...missingIds],
    widgetSpans,
    hiddenWidgetIds,
  };
}

function getStorageKey(persistenceKey: string) {
  return `${STORAGE_KEY_PREFIX}${persistenceKey}`;
}

export function DashboardLayoutEngine({
  widgets,
  sections = [],
  persistenceKey,
  defaultLayoutPreset,
}: {
  widgets: DashboardWidgetDefinition[];
  sections?: DashboardWidgetSection[];
  persistenceKey?: string;
  defaultLayoutPreset?: DashboardLayoutPreset;
}) {
  const defaultState = useMemo(() => getDefaultLayoutState(widgets, defaultLayoutPreset), [widgets, defaultLayoutPreset]);
  const [widgetOrder, setWidgetOrder] = useState(defaultState.widgetOrder);
  const [widgetSpans, setWidgetSpans] = useState<Record<string, WidgetSpan>>(defaultState.widgetSpans);
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>(defaultState.hiddenWidgetIds);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [dropTargetWidgetId, setDropTargetWidgetId] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const widgetMap = useMemo(() => new Map(widgets.map((widget) => [widget.id, widget])), [widgets]);
  const orderedWidgets = widgetOrder
    .map((id) => widgetMap.get(id))
    .filter((widget): widget is DashboardWidgetDefinition => Boolean(widget));
  const visibleWidgets = orderedWidgets.filter((widget) => !hiddenWidgetIds.includes(widget.id));
  const hiddenWidgets = orderedWidgets.filter((widget) => hiddenWidgetIds.includes(widget.id));
  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const visibleWidgetSections = useMemo(() => {
    const sectionOrder = sections.map((section) => section.id);
    const grouped = new Map<string, DashboardWidgetDefinition[]>();

    visibleWidgets.forEach((widget) => {
      const sectionId = widget.sectionId ?? 'default';
      grouped.set(sectionId, [...(grouped.get(sectionId) ?? []), widget]);
    });

    const discovered = Array.from(grouped.keys()).filter((sectionId) => !sectionOrder.includes(sectionId));

    return [...sectionOrder, ...discovered]
      .map((sectionId) => {
        const widgetsInSection = grouped.get(sectionId) ?? [];
        if (!widgetsInSection.length) return null;
        return {
          sectionId,
          meta:
            sectionMap.get(sectionId) ?? {
              id: sectionId,
              title: 'Dashboard section',
              description: 'Grouped widget surfaces for the active workspace.',
            },
          widgets: widgetsInSection,
        };
      })
      .filter((entry): entry is { sectionId: string; meta: DashboardWidgetSection; widgets: DashboardWidgetDefinition[] } => Boolean(entry));
  }, [sectionMap, sections, visibleWidgets]);

  useEffect(() => {
    const normalizedDefaults = normalizeLayoutState(defaultState, widgets, defaultLayoutPreset);
    setWidgetOrder(normalizedDefaults.widgetOrder);
    setWidgetSpans(normalizedDefaults.widgetSpans);
    setHiddenWidgetIds(normalizedDefaults.hiddenWidgetIds);
    setPreferencesLoaded(false);
    hydratedRef.current = false;

    if (!persistenceKey || typeof window === 'undefined') {
      setPreferencesLoaded(false);
      hydratedRef.current = true;
      return;
    }

    try {
      const raw = window.localStorage.getItem(getStorageKey(persistenceKey));
      if (raw) {
        const normalized = normalizeLayoutState(JSON.parse(raw), widgets, defaultLayoutPreset);
        setWidgetOrder(normalized.widgetOrder);
        setWidgetSpans(normalized.widgetSpans);
        setHiddenWidgetIds(normalized.hiddenWidgetIds);
        setPreferencesLoaded(true);
      }
    } catch {
      setPreferencesLoaded(false);
    }

    hydratedRef.current = true;
  }, [defaultLayoutPreset, defaultState, persistenceKey, widgets]);

  useEffect(() => {
    if (!persistenceKey || typeof window === 'undefined' || !hydratedRef.current) return;
    const payload: LayoutPreferenceState = {
      version: 1,
      widgetOrder,
      widgetSpans,
      hiddenWidgetIds,
    };

    try {
      window.localStorage.setItem(getStorageKey(persistenceKey), JSON.stringify(payload));
      setPreferencesLoaded(true);
    } catch {
      // best effort persistence only
    }
  }, [hiddenWidgetIds, persistenceKey, widgetOrder, widgetSpans]);

  useEffect(() => {
    if (!libraryOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLibraryOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [libraryOpen]);

  const hideWidget = (widgetId: string) => {
    setHiddenWidgetIds((current) => (current.includes(widgetId) ? current : [...current, widgetId]));
  };

  const showWidget = (widgetId: string) => {
    setHiddenWidgetIds((current) => current.filter((id) => id !== widgetId));
  };

  const restoreAllWidgets = () => setHiddenWidgetIds([]);

  const resetToDefault = () => {
    setWidgetOrder(defaultState.widgetOrder);
    setWidgetSpans(defaultState.widgetSpans);
    setHiddenWidgetIds(defaultState.hiddenWidgetIds);
    if (persistenceKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(getStorageKey(persistenceKey));
      } catch {
        // ignore storage cleanup errors
      }
    }
    setPreferencesLoaded(false);
  };

  const reorderWidgetsById = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setWidgetOrder((current) => {
      const fromIndex = current.indexOf(draggedId);
      const toIndex = current.indexOf(targetId);
      return moveItemTo(current, fromIndex, toIndex);
    });
  };

  const clearDragState = () => {
    setDraggingWidgetId(null);
    setDropTargetWidgetId(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.94))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                <LayoutIcon className="h-3.5 w-3.5" />
                Layout engine
              </div>
              {/* Widget visibility and library / Role/org dashboard defaults / Saved per-user layout preferences */}
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Reorder widgets, resize cards, manage visible and hidden surfaces, and save a premium dashboard layout per user without touching routing or data access.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Mobile: single-column focus</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Tablet: two-column flow</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Desktop: adaptive twelve-column grid</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                {visibleWidgets.length} visible
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                {hiddenWidgets.length} hidden
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                {preferencesLoaded ? 'Per-user layout saved on this device' : 'Using dashboard defaults until customized'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <FaIcon icon="th-large" fixedWidth className="text-sm" />
                Open widget picker
              </button>
              <button
                type="button"
                onClick={restoreAllWidgets}
                disabled={!hiddenWidgets.length}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaIcon icon="plus-circle" fixedWidth className="text-sm" />
                Restore all
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                <FaIcon icon="refresh" fixedWidth className="text-sm" />
                Reset to default
              </button>
            </div>
          </div>
        </div>

        {!visibleWidgets.length ? (
          <WidgetEmptyState
            title="No visible widgets selected"
            description="Open the widget library to add widgets back into the dashboard layout. Hidden widgets remain available in the side drawer, and reset restores the default layout."
            className="border border-slate-200 bg-white/85 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
          />
        ) : null}

        {visibleWidgets.length ? (
          <div className="space-y-8">
            {visibleWidgetSections.map(({ sectionId, meta, widgets: sectionWidgets }) => (
              <section key={sectionId} className="space-y-4">
                <div className="rounded-[1.7rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.86))] px-5 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur">
                  {meta.eyebrow ? (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">{meta.eyebrow}</p>
                  ) : null}
                  <div className="mt-1 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{meta.title}</h3>
                      <p className="mt-1 max-w-3xl text-sm text-slate-500">{meta.description}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {sectionWidgets.length} widget{sectionWidgets.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-12 2xl:grid-cols-12">
                  {sectionWidgets.map((widget) => {
                    const visibleIndex = visibleWidgets.findIndex((item) => item.id === widget.id);
                    const minSpan = widget.minSpan ?? 'compact';
                    const maxSpan = widget.maxSpan ?? 'hero';
                    const span = clampSpan(widgetSpans[widget.id] ?? widget.defaultSpan ?? 'standard', minSpan, maxSpan);
                    const canMoveUp = visibleIndex > 0;
                    const canMoveDown = visibleIndex < visibleWidgets.length - 1;
                    const canShrink = span !== minSpan;
                    const canExpand = span !== maxSpan;

                    const isDragging = draggingWidgetId === widget.id;
                    const isDropTarget = dropTargetWidgetId === widget.id && draggingWidgetId !== widget.id;

                    return (
                      <section
                        key={widget.id}
                        className={cn(
                          'col-span-1 xl:col-span-6 transition-transform duration-150',
                          spanClassMap[span],
                          isDragging && 'opacity-55 scale-[0.985]',
                        )}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggingWidgetId && draggingWidgetId !== widget.id) setDropTargetWidgetId(widget.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggingWidgetId && draggingWidgetId !== widget.id) {
                            reorderWidgetsById(draggingWidgetId, widget.id);
                          }
                          clearDragState();
                        }}
                        onDragEnd={clearDragState}
                      >
                        <div className={cn(
                          'mb-3 flex flex-col gap-3 rounded-[1.6rem] border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between',
                          isDropTarget
                            ? 'border-brand-300 bg-brand-50/80 ring-2 ring-brand-200/70'
                            : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,251,0.96))]'
                        )}>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{widget.title}</p>
                              <span className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                                {toSpanLabel(span)}
                              </span>
                            </div>
                            <p className="truncate text-xs text-slate-500">{widget.description ?? 'Dashboard widget surface'}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', widget.id);
                                setDraggingWidgetId(widget.id);
                                setDropTargetWidgetId(widget.id);
                              }}
                              onDragEnd={clearDragState}
                              aria-label="Drag to reorder"
                              title="Drag to reorder"
                              className="inline-flex h-10 w-10 cursor-grab items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 active:cursor-grabbing"
                            >
                              <FaIcon icon="arrows-v" fixedWidth className="text-sm" />
                            </button>
                            <ActionIconButton label="Move up" icon={<FaIcon icon="arrow-up" fixedWidth className="text-sm" />} onClick={() => setWidgetOrder((current) => moveItem(current, current.indexOf(widget.id), -1))} disabled={!canMoveUp} />
                            <ActionIconButton label="Move down" icon={<FaIcon icon="arrow-down" fixedWidth className="text-sm" />} onClick={() => setWidgetOrder((current) => moveItem(current, current.indexOf(widget.id), 1))} disabled={!canMoveDown} />
                            <ActionIconButton label="Shrink" icon={<FaIcon icon="compress" fixedWidth className="text-sm" />} onClick={() => setWidgetSpans((current) => ({ ...current, [widget.id]: getNextSpan(span, -1, minSpan, maxSpan) }))} disabled={!canShrink} />
                            <ActionIconButton label="Expand" icon={<FaIcon icon="expand" fixedWidth className="text-sm" />} onClick={() => setWidgetSpans((current) => ({ ...current, [widget.id]: getNextSpan(span, 1, minSpan, maxSpan) }))} disabled={!canExpand} />
                            <ActionIconButton label="Remove widget" icon={<FaIcon icon="eye-slash" fixedWidth className="text-sm" />} onClick={() => hideWidget(widget.id)} tone="danger" />
                          </div>
                        </div>
                        {widget.render()}
                      </section>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>

      <div className={cn('fixed inset-0 z-50 transition', libraryOpen ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!libraryOpen}>
        <div
          className={cn('absolute inset-0 bg-slate-950/35 transition-opacity', libraryOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setLibraryOpen(false)}
        />
        <aside
          aria-label="Widget library"
          data-legacy-label="Close widget picker"
          className={cn(
            'pointer-events-auto absolute inset-y-0 right-0 flex h-full w-full max-w-[32rem] flex-col border-l border-white/20 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(16,30,52,0.98))] text-white shadow-[0_30px_90px_rgba(15,23,42,0.45)] transition-transform duration-300',
            libraryOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                  <FaIcon icon="th-large" fixedWidth className="text-sm" />
                  Widget library
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">Customize dashboard surfaces</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Add or remove widgets, keep the premium command center focused, and preserve layout preferences per signed-in user on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/85 transition hover:bg-white/15"
                aria-label="Close widget library"
                title="Close widget library"
              >
                <FaIcon icon="times" fixedWidth className="text-base" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-200">{visibleWidgets.length} visible</span>
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-100">{hiddenWidgets.length} hidden</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white/70">{preferencesLoaded ? 'Layout prefs saved' : 'Defaults active'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-3">
              {orderedWidgets.map((widget) => {
                const isVisible = !hiddenWidgetIds.includes(widget.id);
                const span = widgetSpans[widget.id] ?? widget.defaultSpan ?? 'standard';
                return (
                  <article
                    key={widget.id}
                    className={cn(
                      'rounded-[1.6rem] border p-4 shadow-[0_16px_45px_rgba(0,0,0,0.12)] backdrop-blur',
                      isVisible ? 'border-emerald-400/15 bg-emerald-500/10' : 'border-white/10 bg-white/6',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{widget.title}</p>
                          <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]', isVisible ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/10 text-white/60')}>
                            {isVisible ? 'Visible' : 'Hidden'}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                            {toSpanLabel(span)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/68">{widget.description ?? 'Dashboard widget surface'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => (isVisible ? hideWidget(widget.id) : showWidget(widget.id))}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition',
                          isVisible
                            ? 'border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15'
                            : 'border-brand-300/20 bg-brand-500/15 text-white hover:bg-brand-500/25',
                        )}
                      >
                        {isVisible ? <FaIcon icon="eye-slash" fixedWidth className="text-sm" /> : <FaIcon icon="plus-circle" fixedWidth className="text-sm" />}
                        {isVisible ? 'Remove widget' : 'Add widget'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={restoreAllWidgets}
                disabled={!hiddenWidgets.length}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaIcon icon="plus-circle" fixedWidth className="text-sm" />
                Restore hidden widgets
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/15"
              >
                <FaIcon icon="refresh" fixedWidth className="text-sm" />
                Reset layout
              </button>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-brand-300/20 bg-brand-500/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500/25"
              >
                <FaIcon icon="check" fixedWidth className="text-sm" />
                Done
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
