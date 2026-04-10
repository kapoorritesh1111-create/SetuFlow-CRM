'use client';

import { useState } from 'react';
import type {
  DashboardSavedView,
  DashboardSectionId,
  DashboardWidgetMoveDirection,
} from '@/features/dashboard/lib/dashboard-layout';
import {
  DASHBOARD_WIDGET_REGISTRY,
  type DashboardWidgetId,
} from '@/features/dashboard/lib/widget-registry';

const SECTION_ITEMS = [
  ['main-visual', 'Main visual'],
  ['world-map', 'World map'],
  ['action-row', 'Action zone'],
] as const;

const WIDGET_TITLES = new Map(
  DASHBOARD_WIDGET_REGISTRY.map((widget) => [widget.id, widget.title] as const),
);

export function DashboardCustomizePanel({
  open,
  hiddenSections,
  widgetLayout,
  activeWidgetIds,
  savedViews,
  onToggleSection,
  onMoveWidget,
  onSaveView,
  onApplySavedView,
  onDeleteSavedView,
  onReset,
}: {
  open: boolean;
  hiddenSections: DashboardSectionId[];
  widgetLayout: string[];
  activeWidgetIds: string[];
  savedViews: DashboardSavedView[];
  onToggleSection: (sectionId: DashboardSectionId) => void;
  onMoveWidget: (widgetId: DashboardWidgetId, direction: DashboardWidgetMoveDirection) => void;
  onSaveView: (name: string) => boolean;
  onApplySavedView: (viewId: string) => void;
  onDeleteSavedView: (viewId: string) => void;
  onReset: () => void;
}) {
  const [viewName, setViewName] = useState('');

  if (!open) return null;

  const visibleWidgetSet = new Set(activeWidgetIds);
  const orderedWidgets = widgetLayout.filter(
    (widgetId): widgetId is DashboardWidgetId => visibleWidgetSet.has(widgetId),
  );

  const handleSaveView = () => {
    const didSave = onSaveView(viewName);
    if (didSave) {
      setViewName('');
    }
  };

  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Dashboard customization</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">Show only the surfaces you need</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Keep the default control panel clean. Hide or restore dashboard sections, reorder real widgets, and save reusable layouts without adding dead controls to the main canvas.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Reset layout
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {SECTION_ITEMS.map(([id, label]) => {
          const visible = !hiddenSections.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggleSection(id)}
              aria-pressed={visible}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {visible ? `Hide ${label}` : `Show ${label}`}
            </button>
          );
        })}
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Saved views</p>
          <h3 className="mt-2 text-base font-semibold text-slate-950">Reuse dashboard layouts</h3>
          <p className="mt-1 text-sm text-slate-600">Save named dashboard views for quick switching between common layouts on this route.</p>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="text"
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            maxLength={40}
            placeholder="View name"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-300 lg:max-w-xs"
          />
          <button
            type="button"
            onClick={handleSaveView}
            disabled={!viewName.trim()}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save current view
          </button>
        </div>

        {savedViews.length ? (
          <div className="mt-4 space-y-3">
            {savedViews.map((view) => (
              <div
                key={view.id}
                className="flex flex-col gap-3 rounded-[1.1rem] border border-slate-200/70 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{view.name}</p>
                  <p className="text-xs text-slate-500">
                    {view.layout.hiddenSections.length} hidden sections · {view.layout.activeWidgetIds.length} widgets
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApplySavedView(view.id)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSavedView(view.id)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No saved views yet.
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Widget order</p>
          <h3 className="mt-2 text-base font-semibold text-slate-950">Reorder dashboard widgets</h3>
          <p className="mt-1 text-sm text-slate-600">Move widgets up or down to control how they appear in the dashboard flow.</p>
        </div>

        <div className="mt-4 space-y-3">
          {orderedWidgets.map((widgetId, index) => {
            const widgetTitle = WIDGET_TITLES.get(widgetId) ?? widgetId;
            const isFirst = index === 0;
            const isLast = index === orderedWidgets.length - 1;

            return (
              <div
                key={widgetId}
                className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-slate-200/70 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{widgetTitle}</p>
                  <p className="text-xs text-slate-500">Position {index + 1}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onMoveWidget(widgetId, 'up')}
                    disabled={isFirst}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveWidget(widgetId, 'down')}
                    disabled={isLast}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Move down
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
