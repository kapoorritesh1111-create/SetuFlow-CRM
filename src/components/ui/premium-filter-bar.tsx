/**
 * PremiumFilterBar — shared filter bar used on Dashboard, Leads, and Pipeline.
 * h-9 · rounded-xl · border-slate-200 · bg-slate-50
 * Hover: bg-white · border-slate-300 · shadow-sm
 * Focus-within on search: blue ring
 */
'use client';
import React from 'react';
import { FaIcon } from '@/components/ui/fa-icon';

const ICON_ALIASES: Record<string, string> = {
  '◎': 'filter',
  '◯': 'filter',
  '○': 'filter',
  '🔍': 'search',
  '🌍': 'globe',
  '🌐': 'globe',
  '📦': 'archive',
  '📅': 'calendar',
  '👤': 'user-circle-o',
  '🎪': 'calendar',
  market: 'globe',
  product: 'archive',
  calendar: 'calendar',
  event: 'calendar',
  owner: 'user-circle-o',
  type: 'filter',
};

function resolveIcon(icon: string) {
  return ICON_ALIASES[icon] ?? icon;
}

interface FilterPillProps {
  icon: string;
  label: string;
  children: React.ReactNode;
  active?: boolean;
  minWidth?: number;
}
export function FilterPill({ icon, label, children, active = false, minWidth = 110 }: FilterPillProps) {
  return (
    <label
      className={[
        'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 transition',
        active
          ? 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-50'
          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white hover:shadow-sm',
      ].join(' ')}
      style={{ minWidth }}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/75 text-[13px] text-slate-500 ring-1 ring-slate-200/70">
        <FaIcon icon={resolveIcon(icon)} fixedWidth />
      </span>
      <div className="flex min-w-0 flex-col gap-[3px] leading-none">{children}</div>
    </label>
  );
}

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon: string;
  label: string;
  active?: boolean;
  minWidth?: number;
}
export function FilterSelect({ icon, label, active, minWidth, children, ...props }: FilterSelectProps) {
  return (
    <FilterPill icon={icon} label={label} active={active} minWidth={minWidth}>
      <span className="text-[8.5px] font-semibold uppercase leading-none tracking-[0.1em] text-slate-400">{label}</span>
      <select {...props} className="cursor-pointer appearance-none border-none bg-transparent text-[11.5px] font-semibold leading-snug text-slate-800 outline-none">
        {children}
      </select>
    </FilterPill>
  );
}

interface FilterSearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  minWidth?: number;
}
export function FilterSearch({ minWidth = 200, className = '', ...props }: FilterSearchProps) {
  return (
    <div
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition hover:border-slate-300 hover:bg-white focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100"
      style={{ minWidth }}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/75 text-[13px] text-slate-400 ring-1 ring-slate-200/70">
        <FaIcon icon="search" fixedWidth />
      </span>
      <input type="text" {...props} className={`w-full border-none bg-transparent text-[11.5px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 ${className}`} />
    </div>
  );
}

export function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100">
      {label}<FaIcon icon="times" className="text-[9px] opacity-60" />
    </button>
  );
}
export function ClearAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50">
      Clear all
    </button>
  );
}
export function FilterMeta({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto whitespace-nowrap text-[10px] font-medium tracking-wide text-slate-400">{children}</span>;
}
export function FilterBar({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-2 ${className}`}>
      {children}
    </div>
  );
}
