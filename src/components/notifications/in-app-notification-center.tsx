'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaIcon } from '@/components/ui/fa-icon';
import { cn } from '@/lib/utils';

type NotificationPriority = 'normal' | 'high' | 'critical';
type PushStatus = 'idle' | 'saving' | 'enabled' | 'unsupported' | 'denied' | 'missing-key' | 'error';

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

type PushSubscriptionRow = { id: string; endpoint: string };

type PushSubscriptionInsert = {
  organization_id: string;
  user_id: string;
  endpoint: string;
  auth_key: string;
  p256dh: string;
  user_agent: string | null;
};

type SupabaseError = { message: string };

type NotificationQuery = {
  select(columns: string): NotificationQuery;
  eq(column: string, value: string | boolean): NotificationQuery;
  is(column: string, value: null): NotificationQuery;
  order(column: string, options?: { ascending?: boolean }): NotificationQuery;
  limit(count: number): Promise<{ data: NotificationRow[] | null; error: SupabaseError | null }>;
  update(values: Partial<Pick<NotificationRow, 'read'>> & { read_at?: string }): { eq(column: string, value: string): Promise<{ error: SupabaseError | null }> };
};

type PushSubscriptionQuery = {
  select(columns: string): PushSubscriptionQuery;
  eq(column: string, value: string): PushSubscriptionQuery;
  limit(count: number): Promise<{ data: PushSubscriptionRow[] | null; error: SupabaseError | null }>;
  insert(row: PushSubscriptionInsert): Promise<{ error: SupabaseError | null }>;
  update(row: Omit<PushSubscriptionInsert, 'organization_id' | 'user_id' | 'endpoint'>): { eq(column: string, value: string): Promise<{ error: SupabaseError | null }> };
};

type NotificationClient = {
  from(table: 'notifications'): NotificationQuery;
  from(table: 'push_subscriptions'): PushSubscriptionQuery;
};

type PushSubscriptionJson = { endpoint?: string; keys?: { auth?: string; p256dh?: string } };

const priorityCopy: Record<NotificationPriority, string> = { normal: 'Normal', high: 'High', critical: 'Critical' };
const webPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? '';

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
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

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function canUseBrowserPush() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

function isIosDevice() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function InAppNotificationCenter({ organizationId, userId }: { organizationId: string; userId: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [iosDevice, setIosDevice] = useState(false);
  const [standalonePwa, setStandalonePwa] = useState(false);
  const unread = useMemo(() => notifications.filter((notification) => !notification.read), [notifications]);
  const unreadCount = unread.length;
  const alertBanner = unread.find((notification) => notification.priority === 'critical') ?? unread.find((notification) => notification.priority === 'high') ?? null;

  useEffect(() => {
    setIosDevice(isIosDevice());
    setStandalonePwa(isStandalonePwa());
    if (!canUseBrowserPush()) { setPushStatus('unsupported'); return; }
    if (!webPushPublicKey) { setPushStatus('missing-key'); return; }
    if (Notification.permission === 'denied') { setPushStatus('denied'); return; }
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => { if (subscription) setPushStatus('enabled'); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      try {
        const supabase = createClient() as unknown as NotificationClient;
        const { data, error } = await supabase
          .from('notifications')
          .select('id,type,title,body,icon,priority,entity_ref,action_url,read,created_at')
          .eq('organization_id', organizationId)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(12);
        if (!cancelled && !error) setNotifications(data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 60000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [organizationId]);

  const markRead = async (notificationId: string) => {
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
    const supabase = createClient() as unknown as NotificationClient;
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
  };

  const enablePush = async () => {
    if (!canUseBrowserPush()) { setPushStatus('unsupported'); return; }
    if (iosDevice && !standalonePwa) { setPushStatus('unsupported'); return; }
    if (!webPushPublicKey) { setPushStatus('missing-key'); return; }
    setPushStatus('saving');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushStatus(permission === 'denied' ? 'denied' : 'idle'); return; }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(webPushPublicKey) }));
      const subscriptionJson = subscription.toJSON() as PushSubscriptionJson;
      const endpoint = subscriptionJson.endpoint ?? subscription.endpoint;
      const authKey = subscriptionJson.keys?.auth;
      const p256dh = subscriptionJson.keys?.p256dh;
      if (!endpoint || !authKey || !p256dh) { setPushStatus('error'); return; }
      const supabase = createClient() as unknown as NotificationClient;
      const payload: PushSubscriptionInsert = { organization_id: organizationId, user_id: userId, endpoint, auth_key: authKey, p256dh, user_agent: navigator.userAgent || null };
      const { data: existingRows } = await supabase.from('push_subscriptions').select('id,endpoint').eq('endpoint', endpoint).limit(1);
      const existingId = existingRows?.[0]?.id;
      const { error } = existingId ? await supabase.from('push_subscriptions').update({ auth_key: authKey, p256dh, user_agent: payload.user_agent }).eq('id', existingId) : await supabase.from('push_subscriptions').insert(payload);
      setPushStatus(error ? 'error' : 'enabled');
    } catch { setPushStatus('error'); }
  };

  const pushLabel = pushStatus === 'enabled' ? 'Push on' : pushStatus === 'saving' ? 'Saving...' : pushStatus === 'denied' ? 'Push blocked' : pushStatus === 'missing-key' ? 'Push setup pending' : pushStatus === 'unsupported' ? 'Push unavailable' : pushStatus === 'error' ? 'Retry push' : 'Enable push';
  const mobilePushHint = iosDevice && !standalonePwa ? 'On iPhone/iPad, add SETU Flow to your Home Screen first, then open the app icon to enable push alerts.' : pushStatus === 'missing-key' ? 'Push subscription is ready in the app, but VAPID public key configuration is still pending.' : pushStatus === 'denied' ? 'Push is blocked in this browser. Re-enable notifications from browser or OS settings.' : 'Mobile push uses the installed PWA service worker and your notification preferences.';

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[320] flex flex-col items-end gap-3 md:inset-x-auto md:bottom-auto md:right-[5.75rem] md:top-4 md:w-auto">
      {alertBanner ? <div className="pointer-events-auto hidden w-full overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5 md:block md:w-[min(360px,calc(100vw-2rem))]"><div className="flex items-start gap-3 p-4"><div className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border', getPriorityClasses(alertBanner.priority))}><FaIcon icon={alertBanner.priority === 'critical' ? 'exclamation-triangle' : 'bell'} fixedWidth /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">{priorityCopy[alertBanner.priority]}</span><span className="text-[11px] font-semibold text-slate-400">{formatWhen(alertBanner.created_at)}</span></div><p className="mt-1 truncate text-sm font-bold text-slate-950">{alertBanner.title}</p>{alertBanner.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{alertBanner.body}</p> : null}</div><button type="button" onClick={() => markRead(alertBanner.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss alert banner">x</button></div></div> : null}
      <div className="pointer-events-auto relative flex w-full justify-end md:block md:w-auto">
        <button type="button" onClick={() => setOpen((value) => !value)} className="relative grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_32px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:text-[#0b2e4a] md:h-11 md:w-11" aria-label="Open notifications" aria-expanded={open}><FaIcon icon="bell-o" fixedWidth />{unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#0c7fff] px-1 text-[10px] font-black text-white ring-2 ring-white">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}</button>
        {open ? <section className="fixed inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-[1.75rem] border border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-28px_70px_rgba(15,23,42,0.24)] ring-1 ring-slate-950/5 md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:mt-2 md:w-[min(360px,calc(100vw-2rem))] md:rounded-[1.35rem] md:pb-0 md:shadow-[0_28px_70px_rgba(15,23,42,0.22)]"><div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" aria-hidden="true" /><div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0c7fff]">Notifications</p><h2 className="text-sm font-bold text-slate-950">{unreadCount ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}</h2><p className="mt-1 max-w-[16rem] text-[11px] leading-5 text-slate-500 md:hidden">{mobilePushHint}</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={enablePush} disabled={pushStatus === 'saving' || pushStatus === 'enabled' || pushStatus === 'unsupported' || pushStatus === 'denied' || pushStatus === 'missing-key'} className={cn('rounded-xl border px-3 py-2 text-[11px] font-bold transition', pushStatus === 'enabled' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50', (pushStatus === 'unsupported' || pushStatus === 'denied' || pushStatus === 'missing-key') && 'cursor-not-allowed opacity-60')} title="Enable browser push notifications">{pushLabel}</button><button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close notifications">x</button></div></div><div className="max-h-[58vh] overflow-y-auto p-2 md:max-h-[420px]">{loading ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading alerts...</div> : notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><p className="text-sm font-bold text-slate-900">No live alert records found</p><p className="mt-1 text-xs leading-5 text-slate-500">The live notifications table currently has no active alert rows for this workspace. New in-app alerts will appear here when workflows create notification records.</p></div> : <div className="space-y-2">{notifications.map((notification) => <div key={notification.id} className={cn('rounded-2xl border p-3 transition', notification.read ? 'border-slate-100 bg-white' : 'border-[#0c7fff]/20 bg-[#f4f9ff]')}><div className="flex items-start gap-3"><div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', getPriorityClasses(notification.priority))}><FaIcon icon={notification.icon || 'bell-o'} fixedWidth /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-slate-950">{notification.title}</p><span className="shrink-0 text-[11px] font-semibold text-slate-400">{formatWhen(notification.created_at)}</span></div>{notification.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.body}</p> : null}<div className="mt-2 flex flex-wrap items-center gap-2"><span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]', getPriorityClasses(notification.priority))}>{priorityCopy[notification.priority]}</span>{notification.entity_ref ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{notification.entity_ref}</span> : null}{notification.action_url ? <a href={notification.action_url} onClick={() => markRead(notification.id)} className="text-[11px] font-bold text-[#0c7fff] hover:underline">Open</a> : null}{!notification.read ? <button type="button" onClick={() => markRead(notification.id)} className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Mark read</button> : null}</div></div></div></div>)}</div>}</div></section> : null}
      </div>
    </div>
  );
}
