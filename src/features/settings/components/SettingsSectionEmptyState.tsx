"use client";

import React from 'react';

interface SettingsSectionEmptyStateProps {
  message: string;
}

/**
 * Shared empty-state block for settings list sections.
 * This keeps the list manager sections visually consistent once wired in.
 */
export default function SettingsSectionEmptyState({ message }: SettingsSectionEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
