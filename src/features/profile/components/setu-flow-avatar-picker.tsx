'use client';

import { useMemo, useState } from 'react';
import { AVATAR_PRESET_CATEGORIES, SETU_FLOW_AVATAR_PRESETS, type AvatarPresetCategory } from '@/lib/profile/avatar-presets';

type Props = {
  selectedUrl?: string | null;
  onSelect: (avatarUrl: string) => void;
  disabled?: boolean;
  compact?: boolean;
  title?: string;
  description?: string;
};

export function SetuFlowAvatarPicker({
  selectedUrl,
  onSelect,
  disabled = false,
  compact = false,
  title = 'Setu Flow avatar gallery',
  description = 'Choose from the approved Setu Flow avatar collection for workspace profiles and shareable vCards.',
}: Props) {
  const [activeCategory, setActiveCategory] = useState<'all' | AvatarPresetCategory>('all');
  const filtered = useMemo(
    () => (activeCategory === 'all' ? SETU_FLOW_AVATAR_PRESETS : SETU_FLOW_AVATAR_PRESETS.filter((item) => item.category === activeCategory)),
    [activeCategory],
  );

  return (
    <div className={`rounded-hero border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5 sm:p-6'} shadow-soft`}>
      <div className="rounded-panel border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-brand-50/60 px-5 py-6 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Setu Flow exclusive</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h3>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {AVATAR_PRESET_CATEGORIES.map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                disabled={disabled}
                onClick={() => setActiveCategory(category.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  active ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                } disabled:opacity-60`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
        {filtered.map((preset) => {
          const selected = selectedUrl === preset.url;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(preset.url)}
              aria-pressed={selected}
              className={`group rounded-panel border p-3 text-center transition ${
                selected
                  ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-500/15'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white hover:shadow-sm'
              } disabled:opacity-60`}
            >
              <div className="mx-auto flex max-w-[10rem] flex-col items-center">
                <div className="relative w-full rounded-card border border-slate-100 bg-white p-3">
                  <img src={preset.url} alt={preset.name} className="aspect-square w-full rounded-full object-contain" />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                    {String(preset.order).padStart(2, '0')}
                  </span>
                  {selected ? (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-brand-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{preset.name}</p>
                {!compact ? <p className="mt-1 text-xs leading-5 text-slate-500">{preset.description}</p> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
