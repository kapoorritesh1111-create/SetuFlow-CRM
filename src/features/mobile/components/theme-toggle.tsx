'use client';

import { useEffect, useState } from 'react';
import { getStoredThemePreference, setThemePreference, type ThemePreference } from '@/lib/theme';

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle() {
  // Read on mount, not during render, so server and first client render match
  // (localStorage isn't available server-side) — avoids a hydration mismatch.
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => { setPreference(getStoredThemePreference()); }, []);

  function choose(next: ThemePreference) {
    setPreference(next);
    setThemePreference(next);
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-ctl bg-surface-2 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => choose(option.value)}
          className={`min-h-10 rounded-[9px] text-xs font-semibold transition ${
            preference === option.value ? 'bg-brand-700 text-white' : 'text-content-secondary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
