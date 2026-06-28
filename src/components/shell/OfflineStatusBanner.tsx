'use client';

import { useEffect, useState } from 'react';
import { BrandColorInputEnhancer } from '@/components/shell/BrandColorInputEnhancer';
import { listPending } from '@/lib/offline/lead-queue';

type BannerState = {
  online: boolean;
  pending: number;
  synced: number;
  failed: number;
};

export function OfflineStatusBanner() {
  const [state, setState] = useState<BannerState>({ online: true, pending: 0, synced: 0, failed: 0 });

  useEffect(() => {
    let mounted = true;

    const refreshPending = () => {
      if (typeof navigator === 'undefined') return;
      listPending()
        .then((pending) => {
          if (!mounted) return;
          setState((current) => ({ ...current, online: navigator.onLine, pending: pending.length }));
        })
        .catch(() => {
          if (!mounted) return;
          setState((current) => ({ ...current, online: navigator.onLine }));
        });
    };

    const setOnline = () => {
      setState((current) => ({ ...current, online: navigator.onLine }));
      refreshPending();
    };

    const onQueued = () => {
      setState((current) => ({ ...current, online: navigator.onLine, pending: Math.max(current.pending, 0) + 1 }));
      refreshPending();
    };

    const onSynced = (event: Event) => {
      const result = (event as CustomEvent<{ synced?: number; failed?: number; skipped?: number }>).detail;
      setState((current) => ({
        ...current,
        online: navigator.onLine,
        synced: result?.synced ?? 0,
        failed: result?.failed ?? 0,
      }));
      refreshPending();
    };

    setOnline();
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOnline);
    window.addEventListener('setuflow-offline-lead-queued', onQueued);
    window.addEventListener('setuflow-offline-sync', onSynced);

    return () => {
      mounted = false;
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOnline);
      window.removeEventListener('setuflow-offline-lead-queued', onQueued);
      window.removeEventListener('setuflow-offline-sync', onSynced);
    };
  }, []);

  const banner = (() => {
    if (state.online && state.pending === 0 && state.synced === 0 && state.failed === 0) return null;

    const copy = !state.online
      ? 'Offline — leads will sync when connection returns.'
      : state.pending > 0
        ? `${state.pending} offline lead${state.pending === 1 ? '' : 's'} waiting to sync.`
        : state.failed > 0
          ? 'Some offline leads still need attention.'
          : `${state.synced} offline lead${state.synced === 1 ? '' : 's'} synced.`;

    return (
      <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-[0_18px_45px_rgba(15,23,42,0.18)]" role="status">
        {copy}
      </div>
    );
  })();

  return (
    <>
      <BrandColorInputEnhancer />
      {banner}
    </>
  );
}
