"use client";

import React from 'react';

interface SettingsListRowProps {
  title: string;
  subtitle?: string;
  onEdit: () => void;
  onDelete: () => void;
  isPending?: boolean;
}

/**
 * A small reusable row component used throughout the settings lists manager.
 * It standardizes the repeated title/subtitle + Edit/Delete action pattern.
 */
export default function SettingsListRow({
  title,
  subtitle,
  onEdit,
  onDelete,
  isPending = false,
}: SettingsListRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 [&>*]:w-full sm:[&>*]:w-auto">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onDelete}
          className="rounded-2xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}