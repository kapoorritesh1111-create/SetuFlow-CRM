'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CountryCoverageDatum } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';
import { cn, formatDate } from '@/lib/utils';
import { COUNTRY_MAP_FOCUS } from '@/features/dashboard/lib/country-map-focus';
import { useWorldMapControls } from '@/features/dashboard/hooks/use-world-map-controls';

type WorldCoverageMapProps = {
  countries: CountryCoverageDatum[];
  selectedCountryCode?: string;
  onSelectCountry: (countryCode: string) => void;
  mode?: WorkspaceMode;
  className?: string;
};

type WorldMapData = {
  width: number;
  height: number;
  paths: Record<string, { path: string; name: string }>;
};

type MarketTier = 'critical' | 'active' | 'watch';

type MarketMarker = {
  country: CountryCoverageDatum;
  center: [number, number];
  tier: MarketTier;
};

const TOOLTIP_OFFSET_X = 14;
const TOOLTIP_OFFSET_Y = 14;
const TOOLTIP_PADDING = 12;
const TOOLTIP_W = 220;
const TOOLTIP_H = 172;

function getMarketTier(c: CountryCoverageDatum): MarketTier {
  if (c.activeLeadCount >= 8 || c.openQuoteCount >= 4) return 'critical';
  if (c.activeLeadCount >= 3 || c.openQuoteCount >= 2) return 'active';
  return 'watch';
}

function getTierFill(tier: MarketTier, mode: WorkspaceMode, intensity: number): string {
  if (mode === 'suppliers') {
    const base = tier === 'critical' ? [168, 85, 247] : tier === 'active' ? [99, 102, 241] : [124, 58, 237];
    return `rgba(${base[0]},${base[1]},${base[2]},${intensity})`;
  }
  if (mode === 'buyers') {
    const base = tier === 'critical' ? [245, 158, 11] : tier === 'active' ? [59, 130, 246] : [8, 145, 178];
    return `rgba(${base[0]},${base[1]},${base[2]},${intensity})`;
  }
  const base = tier === 'critical' ? [245, 158, 11] : tier === 'active' ? [59, 130, 246] : [8, 145, 178];
  return `rgba(${base[0]},${base[1]},${base[2]},${intensity})`;
}

function getTierStroke(tier: MarketTier, mode: WorkspaceMode): string {
  if (mode === 'suppliers') {
    return tier === 'critical' ? '#8b5cf6' : tier === 'active' ? '#6366f1' : '#7c3aed';
  }
  return tier === 'critical' ? '#f59e0b' : tier === 'active' ? '#3b82f6' : '#0891b2';
}

function getPulseColor(tier: MarketTier, mode: WorkspaceMode) {
  if (mode === 'suppliers') {
    return tier === 'critical' ? '#8b5cf6' : tier === 'active' ? '#6366f1' : '#7c3aed';
  }
  return tier === 'critical' ? '#f59e0b' : tier === 'active' ? '#3b82f6' : '#0891b2';
}

function formatCompactMoney(value?: number) {
  if (!value) return '$0';
  if (Math.abs(value) >= 1_000_000) return `$${Math.round(value / 100_000) / 10}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function getPathBounds(path: SVGPathElement | null) {
  if (!path) return null;
  try {
    const box = path.getBBox();
    return { minX: box.x, minY: box.y, maxX: box.x + box.width, maxY: box.y + box.height };
  } catch {
    return null;
  }
}

export function WorldCoverageMap({
  countries,
  selectedCountryCode,
  onSelectCountry,
  mode = 'all',
  className,
}: WorldCoverageMapProps) {
  const [worldMap, setWorldMap] = useState<WorldMapData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const fetchedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const ctrl = new AbortController();
    fetch('/world-map-data.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then((d: WorldMapData) => {
        setWorldMap(d);
        window.setTimeout(() => setMapReady(true), 140);
      })
      .catch(err => { if (!ctrl.signal.aborted) console.error('[map]', err); });
    return () => ctrl.abort();
  }, []);

  const coverageMap = useMemo(
    () => new Map(countries.map(c => [c.countryCode, c] as const)),
    [countries],
  );

  const maxLeads = useMemo(
    () => Math.max(...countries.map(c => c.activeLeadCount), 1),
    [countries],
  );

  const countryStyles = useMemo(() => {
    const map = new Map<string, { fill: string; stroke: string; clickable: boolean }>();
    for (const c of countries) {
      const tier = getMarketTier(c);
      const intensity = 0.36 + (c.activeLeadCount / maxLeads) * 0.58;
      map.set(c.countryCode, {
        fill: getTierFill(tier, mode, intensity),
        stroke: getTierStroke(tier, mode),
        clickable: true,
      });
    }
    return map;
  }, [countries, maxLeads, mode]);

  const marketMarkers = useMemo<MarketMarker[]>(
    () => countries
      .map((country) => {
        const focus = COUNTRY_MAP_FOCUS[country.countryCode];
        if (!focus) return null;
        return { country, center: focus.center, tier: getMarketTier(country) };
      })
      .filter((marker): marker is MarketMarker => marker !== null),
    [countries],
  );

  const isSelectableCountry = useCallback(
    (code: string) => coverageMap.has(code),
    [coverageMap],
  );

  const {
    zoom, pan, dragging, hoveredCode, pointerPosition,
    onZoomOut, onZoomIn, onResetView, focusCountry, focusCountryCenter,
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave,
  } = useWorldMapControls({ isSelectableCountry, onSelectCountry });

  useEffect(() => {
    if (!worldMap || !mapReady) return;
    if (!selectedCountryCode) {
      onResetView();
      return;
    }

    const focusMeta = COUNTRY_MAP_FOCUS[selectedCountryCode];
    if (focusMeta) {
      focusCountryCenter({ center: focusMeta.center, zoom: focusMeta.zoom, mapWidth: worldMap.width, mapHeight: worldMap.height });
      return;
    }

    const path = svgRef.current?.querySelector<SVGPathElement>(`[data-country-code="${selectedCountryCode}"]`) ?? null;
    const bounds = getPathBounds(path);
    if (!bounds) return;
    focusCountry({ bounds, mapWidth: worldMap.width, mapHeight: worldMap.height });
  }, [focusCountry, focusCountryCenter, mapReady, onResetView, selectedCountryCode, worldMap]);

  const hovered = hoveredCode ? coverageMap.get(hoveredCode) ?? null : null;

  const tooltipStyle = useMemo(() => {
    if (!worldMap || !pointerPosition) return { left: TOOLTIP_PADDING, top: TOOLTIP_PADDING };
    return {
      left: Math.min(Math.max(pointerPosition.x + TOOLTIP_OFFSET_X, TOOLTIP_PADDING), worldMap.width - TOOLTIP_W - TOOLTIP_PADDING),
      top: Math.min(Math.max(pointerPosition.y - TOOLTIP_OFFSET_Y, TOOLTIP_PADDING), worldMap.height - TOOLTIP_H - TOOLTIP_PADDING),
    };
  }, [pointerPosition, worldMap]);

  const modeAccent = mode === 'suppliers' ? 'text-purple-300' : mode === 'buyers' ? 'text-amber-300' : 'text-sky-300';
  const modeLabel = mode === 'suppliers' ? 'Supplier view' : mode === 'buyers' ? 'Buyer view' : 'All markets';

  if (!worldMap) {
    return (
      <div className={cn('relative overflow-hidden rounded-[1.6rem] border border-slate-700/60 bg-[#071326] p-4', className)}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/12 pb-3">
          <span className="h-6 w-32 animate-pulse rounded-full bg-slate-800" />
          <div className="flex gap-1.5">
            {[1,2,3].map(i => <span key={i} className="h-8 w-10 animate-pulse rounded-full bg-slate-800" />)}
          </div>
        </div>
        <div className="flex h-[430px] items-center justify-center rounded-[1.4rem] bg-[#0a1a31] lg:h-[460px]">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-slate-400" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Loading trade map…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-[1.7rem] border border-slate-700/80 bg-gradient-to-br from-[#061224] via-[#081a33] to-[#020917] p-4 shadow-[0_26px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/10', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {selectedCountryCode ? (
            <span className="rounded-full bg-amber-400/25 px-3 py-1 text-xs font-bold text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.2)]">
              {coverageMap.get(selectedCountryCode)?.countryName ?? selectedCountryCode} · focused
            </span>
          ) : (
            <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${modeAccent}`}>
              {modeLabel} · {countries.length} market{countries.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="rounded-full border border-slate-600 bg-slate-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">Live coverage · role aware</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${mapReady ? 'bg-emerald-400/20 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>{mapReady ? 'Ready' : 'Loading'}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-600/90 bg-slate-950/80 p-1 shadow-[0_12px_28px_rgba(0,0,0,0.3)]">
          <button type="button" onClick={onZoomOut} aria-label="Zoom out" className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white">−</button>
          <button type="button" onClick={onZoomIn} aria-label="Zoom in" className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white">+</button>
          <button type="button" onClick={onResetView} className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white">Reset</button>
        </div>
      </div>

      <div
        className={cn('relative h-[430px] overflow-hidden rounded-[1.4rem] bg-[#08182f] shadow-inner ring-1 ring-white/10 transition-opacity duration-300 lg:h-[460px]', mapReady ? 'opacity-100' : 'opacity-80', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onPointerLeave={onPointerLeave}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${worldMap.width} ${worldMap.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          role="img"
          aria-label="Global trade coverage map"
        >
          <defs>
            <radialGradient id="ocean" cx="50%" cy="42%" r="74%">
              <stop offset="0%" stopColor="#16315f" />
              <stop offset="62%" stopColor="#0b2344" />
              <stop offset="100%" stopColor="#061326" />
            </radialGradient>
            <filter id="selectedGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#fbbf24" floodOpacity="0.9" />
            </filter>
          </defs>
          <rect width={worldMap.width} height={worldMap.height} fill="url(#ocean)" />

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} className="transition-transform duration-500 ease-out">
            {Object.entries(worldMap.paths).map(([code, item]) => {
              const isSelected = selectedCountryCode === code;
              const style = countryStyles.get(code);

              if (isSelected) {
                return <path key={code} d={item.path} data-country-code={code} fill={style?.fill ?? '#f59e0b'} stroke="#fbbf24" strokeWidth={1.1} filter="url(#selectedGlow)" opacity={1} className="cursor-pointer transition brightness-150 saturate-150" role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onSelectCountry(code); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectCountry(code); } }} />;
              }
              if (style) {
                return <path key={code} d={item.path} data-country-code={code} fill={style.fill} stroke={style.stroke} strokeWidth={1.05} className="cursor-pointer transition hover:brightness-125" role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onSelectCountry(code); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectCountry(code); } }} />;
              }
              return <path key={code} d={item.path} data-country-code={code} fill="#253a5d" stroke="#3d5272" strokeWidth={0.42} opacity={0.86} />;
            })}
            {marketMarkers.map((marker) => {
              const color = getPulseColor(marker.tier, mode);
              const isSelected = selectedCountryCode === marker.country.countryCode;
              return (
                <g key={`marker-${marker.country.countryCode}`} className="pointer-events-none">
                  {marker.tier !== 'watch' && !isSelected ? (
                    <circle cx={marker.center[0]} cy={marker.center[1]} r="4" fill="none" stroke={color} strokeWidth="1.7" opacity="0.95">
                      <animate attributeName="r" from="4" to="18" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="1" to="0" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  ) : null}
                  <circle cx={marker.center[0]} cy={marker.center[1]} r={isSelected ? 5.2 : 4.8} fill={isSelected ? '#fbbf24' : color} stroke={isSelected ? '#f8fafc' : '#020617'} strokeWidth={isSelected ? 1.6 : 1.4} />
                  {marker.country.activeLeadCount > 0 ? (
                    <g transform={`translate(${marker.center[0] + 7} ${marker.center[1] - 9})`}>
                      <rect x="0" y="0" width="20" height="14" rx="7" fill="rgba(2,6,23,0.9)" stroke="rgba(248,250,252,0.45)" />
                      <text x="10" y="10" textAnchor="middle" fill="#f8fafc" fontSize="8" fontWeight="700">{marker.country.activeLeadCount}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>

        {hovered && !dragging ? (
          <div
            className="pointer-events-none absolute z-20 w-[220px] rounded-2xl border border-slate-600/90 bg-slate-950/95 px-3 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.5)] backdrop-blur"
            style={tooltipStyle}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">{hovered.countryName}</p>
                <p className={`mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] ${modeAccent}`}>
                  {getMarketTier(hovered) === 'critical' ? 'Critical market' : getMarketTier(hovered) === 'active' ? 'Active market' : 'Watch'}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-100">
                {hovered.activeLeadCount}L
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-sky-950/70 px-2 py-1 text-[9px] font-semibold text-sky-200">
                Buyers {hovered.buyerLeadCount ?? 0}
              </span>
              <span className="rounded-full bg-purple-950/70 px-2 py-1 text-[9px] font-semibold text-purple-200">
                Suppliers {hovered.supplierLeadCount ?? 0}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {[
                ['Quotes', hovered.openQuoteCount],
                ['RFQs', hovered.openRfqCount],
                ['Pipeline', formatCompactMoney(hovered.pipelineValue)],
                ['Leads', hovered.activeLeadCount],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">{l}</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-1.5 rounded-xl border border-slate-700 bg-slate-900 px-2 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Last activity</p>
              <p className="mt-0.5 text-[12px] font-semibold text-slate-100">
                {hovered.lastActivityAt ? formatDate(hovered.lastActivityAt) : 'No activity yet'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/15 px-1 pt-3">
        {mode === 'suppliers' ? (
          <>
            <LegendDot color="bg-purple-400" label="Critical" />
            <LegendDot color="bg-indigo-500" label="Active" />
            <LegendDot color="bg-violet-600" label="Watch" />
          </>
        ) : (
          <>
            <LegendDot color="bg-amber-400" label="Critical" />
            <LegendDot color="bg-blue-500" label="Active" />
            <LegendDot color="bg-cyan-600" label="Watch" />
          </>
        )}
        <LegendDot color="bg-white/90" label="Selected" />
        <span className="ml-auto rounded-full border border-slate-600/80 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">Country filter auto-focuses the map</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
