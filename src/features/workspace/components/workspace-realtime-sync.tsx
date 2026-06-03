'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

const DEBOUNCE_MS = 800; // Wait 800ms after last DB event before refreshing — batches rapid changes

export function WorkspaceRealtimeSync({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof createBrowserClient>['channel'] extends (arg: any) => infer R ? R : never | null>(null as any);

  const triggerRefresh = useCallback(() => {
    // Debounce: clear any pending refresh and wait again
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSyncing(true);
      router.refresh();
      // Show syncing indicator briefly then clear
      setTimeout(() => {
        setSyncing(false);
        setLastSync(new Date());
      }, 600);
    }, DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Subscribe to all changes on sprint_issues for this org
    const channel = supabase
      .channel(`workspace-sync-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'sprint_issues',
          filter: `organization_id=eq.${orgId}`,
        },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sprint_meta',
        },
        () => triggerRefresh()
      )
      .subscribe();

    channelRef.current = channel as any;

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [orgId, triggerRefresh]);

  if (!syncing && !lastSync) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-lg transition-all duration-300 ${
        syncing
          ? 'border-sky-300/40 bg-sky-950/90 text-sky-200 backdrop-blur-sm'
          : 'border-emerald-300/30 bg-emerald-950/80 text-emerald-300 backdrop-blur-sm'
      }`}
    >
      {syncing ? (
        <>
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
          Syncing…
        </>
      ) : (
        <>
          <span className="text-emerald-400">✓</span>
          Synced {lastSync ? formatAgo(lastSync) : ''}
        </>
      )}
    </div>
  );
}

function formatAgo(date: Date): string {
  const diffS = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffS < 5) return 'just now';
  if (diffS < 60) return `${diffS}s ago`;
  return `${Math.floor(diffS / 60)}m ago`;
}
