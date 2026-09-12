'use client';

import { useEffect, useId, useState } from 'react';
import { getStoredThemePreference, setThemePreference, THEME_CHANGE_EVENT, type ThemePreference } from '@/lib/theme';
import styles from './communication-theme.module.css';

export function CommunicationAppearanceControl() {
  const id = useId();
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    const sync = () => setPreference(getStoredThemePreference());
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);
  return <div className={styles.appearance}>
    <label htmlFor={id}>Appearance</label>
    <select id={id} value={preference} onChange={event => {
      const value = event.target.value;
      if (value !== 'system' && value !== 'light' && value !== 'dark') return;
      setThemePreference(value);
      setPreference(value);
    }}>
      <option value="system">Use device setting</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
    <p>Use device setting follows your phone automatically. All modes use Setu colors.</p>
  </div>;
}
