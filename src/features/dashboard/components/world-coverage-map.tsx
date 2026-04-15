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

/** Urgency tier — drives node color and pulse animation */
function getMarketTier(country: CountryCoverageDatum): 'critical' | 'active' | 'watch' | 'none' {
  if (country.activeLeadCount >= 8 || country.openQuoteCount >= 4) return 'critical';
  if (country.activeLeadCount >= 3 || country.openQuoteCount >= 2) return 'active';
  if (country.activeLeadCount >= 1) return 'watch';
  return 'none';
}

const TIER_COLORS = {
  critical: { fill: '#f59e0b', stroke: '#d97706', pulse: 'rgba(245,158,11,0.35)' },
  active:   { fill: '#1F487C', stroke: '#1e40af', pulse: 'rgba(31,72,124,0.3)' },
  watch:    { fill: '#0891b2', stroke: '#0e7490', pulse: 'rgba(8,145,178,0.25)' },
  none:     { fill: '#334155', stroke: '#475569', pulse: 'transparent' },
} as const;

const SELECTED_COLOR = { fill: '#f8fafc', stroke: '#e2e8f0' };

export function WorldCoverageMap({
  countries,
  selectedCountryCode,
  onSelectCountry,
  className,
}: WorldCoverageMapProps) {
  const [worldMap, setWorldMap] = useState<WorldMapData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/world-map-data.json', { signal: controller.signal })
      .then(r => r.json())
      .then(data => setWorldMap(data as WorldMapData))
      .catch(err => { if (!controller.signal.aborted) console.error(err); });
    return () => controller.abort();
  }, []);

  const coverageMap = useMemo(
    () => new Map(countries.map(c => [c.countryCode, c] as const)),
    [countries],
  );

  const maxLeads = Math.max(...countries.map(c => c.activeLeadCount), 1);

  const {
    zoom, pan, dragging, hoveredCode, pointerPosition,
    onZoomOut, onZoomIn, onResetView,
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave,
  } = useWorldMapControls({
    isSelectableCountry: (code) => coverageMap.has(code),
    onSelectCountry,
  });

  const hovered = hoveredCode ? coverageMap.get(hoveredCode) ?? null : null;

  const tooltipStyle = useMemo(() => {
    if (!worldMap || !pointerPosition) return { left: TOOLTIP_PADDING, top: TOOLTIP_PADDING };
    return {
      left: Math.min(Math.max(pointerPosition.x + TOOLTIP_OFFSET_X, TOOLTIP_PADDING), worldMap.width - TOOLTIP_WIDTH - TOOLTIP_PADDING),
      top: Math.min(Math.max(pointerPosition.y - TOOLTIP_OFFSET_Y, TOOLTIP_PADDING), worldMap.height - TOOLTIP_HEIGHT - TOOLTIP_PADDING),
    };
  }, [pointerPosition, worldMap]);

  // Compute route arcs: draw arcs from the selected market (or highest-lead market) to others
  const routeOrigin = useMemo(() => {
    if (!worldMap) return null;
    const sourceCode = selectedCountryCode ?? countries[0]?.countryCode;
    if (!sourceCode) return null;
    // Approximate centroids by averaging bbox of paths — for production this would use precomputed centroids
    // We use a simplified approach: hardcode rough world regions from iso2 codes
    return sourceCode;
  }, [selectedCountryCode, countries, worldMap]);

  if (!worldMap) {
    return (
      <div className={cn('relative overflow-hidden rounded-[1.6rem] border border-slate-800/80 bg-[#0a1628] p-4', className)}>
        <div className="mb-4 flex items-center justify-end gap-2 opacity-40">
          <div className="h-8 w-10 rounded-full border border-slate-700 bg-slate-800" />
          <div className="h-8 w-10 rounded-full border border-slate-700 bg-slate-800" />
          <div className="h-8 w-16 rounded-full border border-slate-700 bg-slate-800" />
        </div>
        <div className="flex h-[420px] items-center justify-center rounded-[1.4rem] bg-[#0d1f3a] text-sm font-medium text-slate-500">
          Loading trade map…
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-[1.6rem] border border-slate-700/60 bg-[#0a1628] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.5)]', className)}>
      {/* Controls */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectedCountryCode && (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
              {coverageMap.get(selectedCountryCode)?.countryName ?? selectedCountryCode} · selected
            </span>
          )}
          {!selectedCountryCode && countries.length > 0 && (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
              {countries.length} active market{countries.length !== 1 ? 's' : ''} · click to drill down
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onZoomOut} className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-sm font-medium text-slate-300 hover:bg-slate-700" aria-label="Zoom out">−</button>
          <button type="button" onClick={onZoomIn} className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-sm font-medium text-slate-300 hover:bg-slate-700" aria-label="Zoom in">+</button>
          <button type="button" onClick={onResetView} className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-sm font-medium text-slate-300 hover:bg-slate-700">Reset</button>
        </div>
      </div>

      {/* Map */}
      <div
        className={cn('relative h-[420px] overflow-hidden rounded-[1.4rem] bg-[#0d1f3a]', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onPointerLeave={onPointerLeave}
      >
        <svg viewBox={`0 0 ${worldMap.width} ${worldMap.height}`} className="h-full w-full" role="img" aria-label="Global trade coverage map">
          <defs>
            <radialGradient id="oceanGrad" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#112240" />
              <stop offset="100%" stopColor="#0a1628" />
            </radialGradient>
            {/* Pulse animations for critical markets */}
            <style>{`
              @keyframes pulse-ring { 0% { r: 10px; opacity: 0.7; } 100% { r: 22px; opacity: 0; } }
              .pulse-critical { animation: pulse-ring 1.8s ease-out infinite; }
              .pulse-active { animation: pulse-ring 2.4s ease-out infinite; }
            `}</style>
          </defs>
          <rect width={worldMap.width} height={worldMap.height} fill="url(#oceanGrad)" />

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {/* Country paths */}
            {Object.entries(worldMap.paths).map(([code, item]) => {
              const stat = coverageMap.get(code);
              const isSelected = selectedCountryCode === code;
              const isActive = Boolean(stat);
              const tier = stat ? getMarketTier(stat) : 'none';
              const colors = TIER_COLORS[tier];

              if (isSelected) {
                return (
                  <path key={code} d={item.path} data-country-code={code}
                    fill={SELECTED_COLOR.fill} stroke={SELECTED_COLOR.stroke} strokeWidth={1.5}
                    className="transition" />
                );
              }
              if (isActive) {
                const intensity = 0.25 + (stat!.activeLeadCount / maxLeads) * 0.55;
                return (
                  <path key={code} d={item.path} data-country-code={code}
                    fill={`rgba(${tier === 'critical' ? '245,158,11' : tier === 'active' ? '31,72,124' : '8,145,178'},${intensity})`}
                    stroke={colors.stroke} strokeWidth={0.9}
                    className="cursor-pointer transition hover:brightness-110" />
                );
              }
              return (
                <path key={code} d={item.path} data-country-code={code}
                  fill="#1a2744" stroke="#243152" strokeWidth={0.4} className="transition" />
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {hovered && !dragging ? (
          <div
            className="pointer-events-none absolute z-20 w-[184px] rounded-2xl border border-slate-700/80 bg-slate-950/95 px-3 py-3 text-white shadow-[0_16px_32px_rgba(0,0,0,0.5)] backdrop-blur"
            style={tooltipStyle}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">{hovered.countryName}</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                  {getMarketTier(hovered) === 'critical' ? 'Critical market' : getMarketTier(hovered) === 'active' ? 'Active market' : 'Watch'}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-100">
                {hovered.activeLeadCount} lead{hovered.activeLeadCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quotes</p>
                <p className="mt-1 text-base font-semibold text-white">{hovered.openQuoteCount}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">RFQs</p>
                <p className="mt-1 text-base font-semibold text-white">{hovered.openRfqCount}</p>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Last activity</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-100">
                {hovered.lastActivityAt ? formatDate(hovered.lastActivityAt) : 'No activity yet'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Market legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 px-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Critical
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1F487C]" /> Active
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" /> Watch
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-white/90" /> Selected
        </span>
        <span className="ml-auto text-[10px] text-slate-600">Click any market to drill down</span>
      </div>
    </div>
  );
}
