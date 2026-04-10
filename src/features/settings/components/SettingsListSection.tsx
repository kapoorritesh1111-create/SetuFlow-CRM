"use client";

import React from 'react';
import { checkboxClassName } from '@/components/ui/checkbox';
import {
  ToolbarActionButton,
  ToolbarCheckboxCard,
  ToolbarField,
  ToolbarSearchInput,
  ToolbarStat,
  WorkspaceToolbar,
} from '@/components/ui/workspace-toolbar';

interface SettingsListSectionProps {
  title: string;
  description: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (checked: boolean) => void;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
  toolbarSlot?: React.ReactNode;
  emptyState?: React.ReactNode;
}

export default function SettingsListSection({
  title,
  description,
  count,
  expanded,
  onToggle,
  searchValue,
  onSearchChange,
  showInactive,
  onShowInactiveChange,
  addLabel,
  onAdd,
  children,
  toolbarSlot,
  emptyState,
}: SettingsListSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <ToolbarActionButton type="button" onClick={onToggle}>
          {expanded ? 'Collapse' : 'Expand'}
        </ToolbarActionButton>
      </div>

      {expanded && (
        <>
          <div className="mt-4">
            <WorkspaceToolbar
              searchSlot={
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <ToolbarField label="Search">
                    <ToolbarSearchInput
                      value={searchValue}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={`Search ${title.toLowerCase()}`}
                    />
                  </ToolbarField>
                  <ToolbarField label="Visibility">
                    <ToolbarCheckboxCard>
                      <input
                        type="checkbox"
                        className={checkboxClassName()}
                        checked={showInactive}
                        onChange={(e) => onShowInactiveChange(e.target.checked)}
                      />
                      Show inactive
                    </ToolbarCheckboxCard>
                  </ToolbarField>
                </div>
              }
              actionSlot={
                <ToolbarActionButton type="button" tone="primary" onClick={onAdd}>
                  {addLabel}
                </ToolbarActionButton>
              }
              metaSlot={
                <div className="flex flex-wrap gap-2">
                  <ToolbarStat label={`${count} visible`} />
                </div>
              }
            />
          </div>

          {toolbarSlot ? <div className="mt-4">{toolbarSlot}</div> : null}

          <div className="mt-4 space-y-2">{children}</div>
          {emptyState}
        </>
      )}
    </section>
  );
}
