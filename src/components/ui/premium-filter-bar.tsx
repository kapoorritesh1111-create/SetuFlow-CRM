/**
 * PremiumFilterBar — shared filter bar used on Dashboard, Leads, and Pipeline.
 * h-9 · rounded-xl · border-slate-200 · bg-slate-50
 * Hover: bg-white · border-slate-300 · shadow-sm
 * Focus-within on search: blue ring
 */
'use client';
import React from 'react';

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
        'inline-flex items-center gap-1.5 h-9 rounded-xl border px-3 cursor-pointer transition',
        active
          ? 'border-blue-200 bg-blue-50 hover:bg-blue-50 hover:border-blue-300'
          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm',
      ].join(' ')}
      style={{ minWidth }}
    >
      <span className="text-[13px] flex-shrink-0 leading-none">{icon}</span>
      <div className="flex flex-col leading-none gap-[3px] min-w-0">{children}</div>
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
      <span className="text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 leading-none">{label}</span>
      <select {...props} className="border-none bg-transparent outline-none text-[11.5px] font-bold text-slate-800 appearance-none cursor-pointer leading-snug">
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
      className="inline-flex items-center gap-2 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white hover:bg-white hover:border-slate-300"
      style={{ minWidth }}
    >
      <span className="text-slate-400 text-[13px] flex-shrink-0">🔍</span>
      <input type="text" {...props} className={`border-none bg-transparent outline-none text-[11.5px] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal w-full ${className}`} />
    </div>
  );
}

export function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition">
      {label}<span className="opacity-60 text-[9px]">✕</span>
    </button>
  );
}
export function ClearAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition">
      Clear all
    </button>
  );
}
export function FilterMeta({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto text-[10px] font-semibold text-slate-400 whitespace-nowrap tracking-wide">{children}</span>;
}
export function FilterBar({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-2 ${className}`}>
      {children}
    </div>
  );
}
