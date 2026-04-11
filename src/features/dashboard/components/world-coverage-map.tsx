'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CountryCoverageDatum } from '@/features/dashboard/types';
import { cn, formatDate } from '@/lib/utils';
import { useWorldMapControls } from '@/features/dashboard/hooks/use-world-map-controls';

type WorldCoverageMapProps = {
  countries: CountryCoverageDatum[];
  selectedCountryCode?: string;
  onSelectCountry: (countryCode: string) => void;
  className?: string;
};

type WorldMapData = {
  width: number;
  height: number;
  paths: Record<string, { path: string; name: string }>;
};

const TOOLTIP_WIDTH = 184;
const TOOLTIP_HEIGHT = 126;
const TOOLTIP_OFFSET_X = 14;
const TOOLTIP_OFFSET_Y = 14;
const TOOLTIP_PADDING = 12;

export function WorldCoverageMap({
  countries,
  selectedCountryCode,
  onSelectCountry,
  className,
}: WorldCoverageMapProps) {
  const [worldMap, setWorldMap] = useState<WorldMapData | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorldMap() {
      const response = await fetch('/world-map-data.json', { signal: controller.signal });

      if (!response.ok) {
        throw new Error('Failed to load world map data');
      }

      const data = (await response.json()) as WorldMapData;
      setWorldMap(data);
    }

    loadWorldMap().catch((error: unknown) => {
      if (controller.signal.aborted) {
        return;
      }

      console.error(error);
    });

    return () => controller.abort();
  }, []);

  const coverageMap = useMemo(
    () => new Map(countries.map((country) => [country.countryCode, country] as const)),
    [countries],
  );

  const maxValue = Math.max(...countries.map((country) => country.activeLeadCount), 1);

  const isSelectableCountry = (countryCode: string) => coverageMap.has(countryCode);

  const {
    zoom,
    pan,
    dragging,
    hoveredCode,
    pointerPosition,
    onZoomOut,
    onZoomIn,
    onResetView,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  } = useWorldMapControls({
    isSelectableCountry,
    onSelectCountry,
  });

  const hovered = hoveredCode ? coverageMap.get(hoveredCode) ?? null : null;

  const tooltipStyle = useMemo(() => {
    if (!worldMap) {
      return {
        left: TOOLTIP_PADDING,
        top: TOOLTIP_PADDING,
      };
    }

    if (!pointerPosition) {
      return {
        left: TOOLTIP_PADDING,
        top: TOOLTIP_PADDING,
      };
    }

    const maxLeft = worldMap.width - TOOLTIP_WIDTH - TOOLTIP_PADDING;
    const maxTop = worldMap.height - TOOLTIP_HEIGHT - TOOLTIP_PADDING;

    return {
      left: Math.min(
        Math.max(pointerPosition.x + TOOLTIP_OFFSET_X, TOOLTIP_PADDING),
        maxLeft,
      ),
      top: Math.min(
        Math.max(pointerPosition.y - TOOLTIP_OFFSET_Y, TOOLTIP_PADDING),
        maxTop,
      ),
    };
  }, [pointerPosition, worldMap]);

  if (!worldMap) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_48%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-end gap-2 opacity-60">
          <div className="h-9 w-11 rounded-full border border-slate-200 bg-white" />
          <div className="h-9 w-11 rounded-full border border-slate-200 bg-white" />
          <div className="h-9 w-20 rounded-full border border-slate-200 bg-white" />
        </div>
        <div className="flex h-[420px] items-center justify-center rounded-[1.4rem] bg-[#eef4ff] text-sm font-medium text-slate-500">
          Loading world map…
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_48%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onZoomOut}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={onResetView}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          Reset
        </button>
      </div>

      <div
        className={cn(
          'relative h-[420px] overflow-hidden rounded-[1.4rem] bg-[#eef4ff]',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      >
        <svg
          viewBox={`0 0 ${worldMap.width} ${worldMap.height}`}
          className="h-full w-full"
          role="img"
          aria-label="Coverage snapshot vector map"
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {Object.entries(worldMap.paths).map(([code, item]) => {
              const stat = coverageMap.get(code);
              const activeLeadCount = stat?.activeLeadCount ?? 0;
              const intensity = activeLeadCount ? 0.32 + (activeLeadCount / maxValue) * 0.68 : 0;
              const isSelected = selectedCountryCode === code;
              const isActive = Boolean(stat);

              return (
                <path
                  key={code}
                  d={item.path}
                  data-country-code={code}
                  fill={isSelected ? '#0f172a' : isActive ? `rgba(29,78,216,${intensity})` : '#d7e3f5'}
                  stroke={isSelected ? '#0f172a' : isActive ? '#1d4ed8' : '#ffffff'}
                  strokeWidth={isSelected ? 1.8 : isActive ? 1.1 : 0.6}
                  className={cn(isActive ? 'transition hover:brightness-95' : 'transition')}
                />
              );
            })}
          </g>
        </svg>

        {hovered && !dragging ? (
          <div
            className="pointer-events-none absolute z-20 w-[184px] rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-white shadow-[0_16px_32px_rgba(2,6,23,0.35)]"
            style={tooltipStyle}
          >
            <div className="absolute -bottom-2 left-5 h-4 w-4 rotate-45 border-b border-r border-slate-800 bg-slate-950" />

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold leading-4 text-white">
                  {hovered.countryName}
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Coverage snapshot
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold leading-none text-slate-100">
                {hovered.activeLeadCount} lead{hovered.activeLeadCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  RFQs
                </div>
                <div className="mt-1 text-base font-semibold leading-none text-white">
                  {hovered.openRfqCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Quotes
                </div>
                <div className="mt-1 text-base font-semibold leading-none text-white">
                  {hovered.openQuoteCount}
                </div>
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Last activity
              </div>
              <div className="mt-1 text-[13px] font-semibold leading-5 text-slate-100">
                {hovered.lastActivityAt ? formatDate(hovered.lastActivityAt) : 'No activity yet'}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
