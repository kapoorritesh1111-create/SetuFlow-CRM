'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { countOfflineTradeCaptures, subscribeOfflineTradeCaptureQueue } from '@/lib/trade-events/offline-capture-queue';
import { ThemeToggle } from './theme-toggle';

export function AppearancePreview() {
  return <section className="rounded-hero bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90"><h2 className="text-xl font-black text-slate-950 dark:text-white">Appearance</h2><div className="mt-3"><ThemeToggle /></div></section>;
}

export function SettingsList() {
  const [pendingCaptures, setPendingCaptures] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('Checking');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const refreshQueue = () => setPendingCaptures(countOfflineTradeCaptures());
    refreshQueue();
    const unsubscribe = subscribeOfflineTradeCaptureQueue(refreshQueue);
    setInstalled(window.matchMedia('(display-mode: standalone)').matches
      || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    setNotificationPermission('Notification' in window ? Notification.permission : 'Unavailable');
    return unsubscribe;
  }, []);

  const rows = [
    { label: 'Install as app', value: installed ? 'Installed' : 'Use browser Share menu', href: '/install' },
    { label: 'Push notifications', value: notificationPermission === 'granted' ? 'Browser permitted' : notificationPermission === 'denied' ? 'Blocked in browser' : notificationPermission === 'default' ? 'Not enabled' : notificationPermission, href: '/mobile/notifications' },
    { label: 'Offline capture queue', value: pendingCaptures === null ? 'Checking' : pendingCaptures ? `${pendingCaptures} on this device` : 'No captures queued', href: '/trade-events' },
    { label: 'Mobile theme', value: 'Choose above', href: null },
  ];
  return <section className="rounded-hero bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90">
    <h2 className="text-xl font-black text-slate-950 dark:text-white">Device settings</h2>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Status reflects this browser, not a promise that every integration is configured.</p>
    {rows.map(row => <div key={row.label} className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm font-semibold text-slate-700 last:border-0 dark:border-slate-800 dark:text-slate-200">
      {row.href ? <Link className="underline-offset-2 hover:underline" href={row.href}>{row.label}</Link> : <span>{row.label}</span>}
      <span className="max-w-[54%] text-right text-xs font-semibold text-blue-700 dark:text-sky-300">{row.value}</span>
    </div>)}
  </section>;
}
