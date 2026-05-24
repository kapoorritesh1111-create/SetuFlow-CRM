'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaIcon } from '@/components/ui/fa-icon';
import { cn } from '@/lib/utils';

type NotificationPriority = 'normal' | 'high' | 'critical';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  icon: string | null;
  priority: NotificationPriority;
  entity_ref: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

type NotificationQuery = {
  select(columns: string): NotificationQuery;
  eq(column: string, value: string | boolean): NotificationQuery;
  is(column: string, value: null): NotificationQuery;
  order(column: string, options?: { ascending?: boolean }): NotificationQuery;
  limit(count: number): Promise<{ data: NotificationRow[] | null; error: { message: string } | null }>;
  update(values: Partial<Pick<NotificationRow, 'read'>> & { read_at?: string }): {
    eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
  };
};

type NotificationClient = {
  from(table: 'notifications'): NotificationQuery;
};

const priorityCopy: Record<NotificationPriority, string> = {
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date);
}

function getPriorityClasses(priority: NotificationPriority) {
  if (priority === 'critical') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'high') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export function InAppNotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const unread = useMemo(() => notifications.filter((notification) => !notification.read), [notifications]);
  const unreadCount = unread.length;
  const alertBanner = unread.find((notification) => notification.priority === 'critical') ?? unread.find((notification) => notification.priority === 'high') ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const supabase = createClient() as unknown as NotificationClient;
        const { data, error } = await supabase
          .from('notifications')
          .select('id,type,title,body,icon,priority,entity_ref,action_url,read,created_at')
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(12);

        if (!cancelled && !error) {
          setNotifications(data ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const markRead = async (notificationId: string) => {
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
    const supabase = createClient() as unknown as NotificationClient;
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
  };

  return (
    <div className="pointer-events-none fixed right-4 top-[7.25rem] z-[320] flex w-[min(360px,calc(100vw-2rem))] flex-col items-end gap-3 md:right-8 md:top-[6.25rem]">
      {alertBanner ? (
        <div className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5">
          <div className="flex items-start gap-3 p-4">
            <div className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border', getPriorityClasses(alertBanner.priority))}>
              <FaIcon icon={alertBanner.priority === 'critical' ? 'exclamation-triangle' : 'bell'} fixedWidth />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">{priorityCopy[alertBanner.priority]}</span>
                <span className="text-[11px] font-semibold text-slate-400">{formatWhen(alertBanner.created_at)}</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-slate-950">{alertBanner.title}</p>
              {alertBanner.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{alertBanner.body}</p> : null}
            </div>
            <button type="button" onClick={() => markRead(alertBanner.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss alert banner">×</button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="relative grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_32px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:text-[#0b2e4a]"
          aria-label="Open notifications"
          aria-expanded={open}
        >
          <FaIcon icon="bell-o" fixedWidth />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#0c7fff] px-1 text-[10px] font-black text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <section className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0c7fff]">Notifications</p>
                <h2 className="text-sm font-bold text-slate-950">{unreadCount ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close notifications">×</button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-2">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-bold text-slate-900">No notifications yet</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">New in-app alerts will appear here as the workflow creates them.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={cn('rounded-2xl border p-3 transition', notification.read ? 'border-slate-100 bg-white' : 'border-[#0c7fff]/20 bg-[#f4f9ff]')}>
                      <div className="flex items-start gap-3">
                        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', getPriorityClasses(notification.priority))}>
                          <FaIcon icon={notification.icon || 'bell-o'} fixedWidth />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-slate-950">{notification.title}</p>
                            <span className="shrink-0 text-[11px] font-semibold text-slate-400">{formatWhen(notification.created_at)}</span>
                          </div>
                          {notification.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.body}</p> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]', getPriorityClasses(notification.priority))}>{priorityCopy[notification.priority]}</span>
                            {notification.entity_ref ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{notification.entity_ref}</span> : null}
                            {notification.action_url ? <a href={notification.action_url} onClick={() => markRead(notification.id)} className="text-[11px] font-bold text-[#0c7fff] hover:underline">Open</a> : null}
                            {!notification.read ? <button type="button" onClick={() => markRead(notification.id)} className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Mark read</button> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
