"use client";

import React from 'react';

export interface PipelineBoardFilterOption {
  id: string;
  label: string;
}

interface PipelineBoardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  leadType: string;
  onLeadTypeChange: (value: string) => void;
  ownerId?: string;
  onOwnerIdChange?: (value: string) => void;
  owners?: PipelineBoardFilterOption[];
}

/**
 * Shared filter bar scaffold for pipeline-board.tsx.
 * The attached repo does not include the current pipeline board file, so this
 * component is provided as a ready-to-wire extraction target for the next pass.
 */
export default function PipelineBoardFilters({
  search,
  onSearchChange,
  leadType,
  onLeadTypeChange,
  ownerId = '',
  onOwnerIdChange,
  owners = [],
}: PipelineBoardFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Search</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company, contact or stage"
            className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lead type</span>
          <select
            value={leadType}
            onChange={(e) => onLeadTypeChange(e.target.value)}
            className="h-11 min-w-[160px] rounded-2xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
          >
            <option value="">All</option>
            <option value="buyer">Buyers</option>
            <option value="supplier">Suppliers</option>
          </select>
        </label>
        {onOwnerIdChange ? (
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Owner</span>
            <select
              value={ownerId}
              onChange={(e) => onOwnerIdChange(e.target.value)}
              className="h-11 min-w-[180px] rounded-2xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
            >
              <option value="">All owners</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.label}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
