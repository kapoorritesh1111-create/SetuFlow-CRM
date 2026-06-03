'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaIcon } from '@/components/ui/fa-icon';
import { cn } from '@/lib/utils';

type NotificationPriority = 'normal' | 'high' | 'critical';
type PushStatus = 'idle' | 'saving' | 'enabled' | 'unsupported' | 'denied' | 'missing-key' | 'error';
type NotificationSource = 'stored' | 'derived';
type NotificationGroup = 'Follow-Up' | 'Quotes' | 'Orders' | 'Approvals' | 'Other';

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
  source?: NotificationSource;
};

type FollowUpRow = { id: string; lead_id: string | null; scheduled_at: string; status: string; notes: string | null };
type ScheduledTaskRow = { id: string; lead_id: string | null; task_type: string; scheduled_for: string; status: string };
type PushSubscriptionRow = { id: string; endpoint: string };
type PushSubscriptionInsert = { organization_id: string; user_id: string; endpoint: string; auth_key: string; p256dh: string; user_agent: string | null };
type SupabaseError = { message: string };

type SelectQuery<T> = {
  select(columns: string): SelectQuery<T>;
  eq(column: string, value: string | boolean): SelectQuery<T>;
  is(column: string, value: null): SelectQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SelectQuery<T>;
  limit(count: number): Promise<{ data: T[] | null; error: SupabaseError | null }>;
  update?(values: Partial<Pick<NotificationRow, 'read'>> & { read_at?: string }): { eq(column: string, value: string): Promise<{ error: SupabaseError | null }> };
};

type PushSubscriptionQuery = {
  select(columns: string): PushSubscriptionQuery;
  eq(column: string, value: string): PushSubscriptionQuery;
  limit(count: number): Promise<{ data: PushSubscriptionRow[] | null; error: SupabaseError | null }>;
  insert(row: PushSubscriptionInsert): Promise<{ error: SupabaseError | null }>;
  update(row: Omit<PushSubscriptionInsert, 'organization_id' | 'user_id' | 'endpoint'>): { eq(column: string, value: string): Promise<{ error: SupabaseError | null }> };
};

type NotificationClient = {
  from(table: 'notifications'): SelectQuery<NotificationRow>;
  from(table: 'lead_follow_ups'): SelectQuery<FollowUpRow>;
  from(table: 'scheduled_tasks'): SelectQuery<ScheduledTaskRow>;
  from(table: 'push_subscriptions'): PushSubscriptionQuery;
};

type PushSubscriptionJson = { endpoint?: string; keys?: { auth?: string; p256dh?: string } };

type GroupedNotifications = { group: NotificationGroup; items: NotificationRow[] };

const priorityCopy: Record<NotificationPriority, string> = { normal: 'Normal', high: 'High', critical: 'Critical' };
const webPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? '';
const DISMISSED_DERIVED_KEY = 'setuflow-dismissed-derived-alerts';
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const GROUPS: NotificationGroup[] = ['Follow-Up', 'Quotes', 'Orders', 'Approvals', 'Other'];
const groupIcons: Record<NotificationGroup, string> = { 'Follow-Up': 'clock-o', Quotes: 'comments-o', Orders: 'archive', Approvals: 'paper-plane-o', Other: 'bell-o' };
const ENTITY_ROUTE_ALIASES: Array<{ pattern: RegExp; route: string; supportsFocus: boolean }> = [
  { pattern: /lead|follow[-_\s]?up|contact/i, route: '/leads', supportsFocus: true },
  { pattern: /quote|rfq/i, route: '/quotes', supportsFocus: true },
  { pattern: /order|shipment|execution/i, route: '/orders', supportsFocus: true },
  { pattern: /task|todo/i, route: '/tasks', supportsFocus: true },
  { pattern: /product|catalog/i, route: '/products', supportsFocus: true },
  { pattern: /approval|send|communication|message|email|opened/i, route: '/approval-send', supportsFocus: false },
  { pattern: /pipeline|risk|exception|blocker/i, route: '/pipeline', supportsFocus: false },
];

function notificationText(notification: NotificationRow) {
  return [notification.type, notification.title, notification.body ?? '', notification.entity_ref ?? ''].join(' ');
}

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

function readDismissedDerivedAlerts() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DISMISSED_DERIVED_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function saveDismissedDerivedAlerts(values: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISMISSED_DERIVED_KEY, JSON.stringify([...values].slice(-200)));
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function safeRelativeActionUrl(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) return null;
  return trimmed;
}

function groupForNotification(notification: NotificationRow): NotificationGroup {
  const text = notificationText(notification);
  if (/quote|rfq|pricing/i.test(text)) return 'Quotes';
  if (/order|shipment|execution/i.test(text)) return 'Orders';
  if (/approval|send|communication|message|email|opened/i.test(text)) return 'Approvals';
  if (/lead|follow[-_\s]?up|task|todo|contact/i.test(text)) return 'Follow-Up';
  return 'Other';
}

function routeForNotification(notification: NotificationRow) {
  const explicitUrl = safeRelativeActionUrl(notification.action_url);
  if (explicitUrl) return explicitUrl;
  const text = notificationText(notification);
  const route = ENTITY_ROUTE_ALIASES.find((item) => item.pattern.test(text));
  if (!route) return null;
  const entityId = notification.entity_ref?.match(UUID_PATTERN)?.[0] ?? null;
  if (entityId && route.supportsFocus) return `${route.route}?focus=${encodeURIComponent(entityId)}`;
  return route.route;
}

function visibleEntityLabel(notification: NotificationRow) {
  const group = groupForNotification(notification);
  if (group === 'Follow-Up') return 'Lead';
  if (group === 'Quotes') return 'Quote';
  if (group === 'Orders') return 'Order';
  if (group === 'Approvals') return 'Approval';
  return null;
}

function groupNotifications(notifications: NotificationRow[]): GroupedNotifications[] {
  const grouped = new Map<NotificationGroup, NotificationRow[]>();
  notifications.forEach((notification) => {
    const group = groupForNotification(notification);
    grouped.set(group, [...(grouped.get(group) ?? []), notification]);
  });
  return GROUPS.map((group) => ({ group, items: grouped.get(group) ?? [] })).filter((section) => section.items.length > 0);
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

function isOpenStatus(status: string | null | undefined) {
  return !['completed', 'complete', 'done', 'cancelled', 'canceled'].includes(String(status ?? '').toLowerCase());
}

function derivedFollowUpAlert(row: FollowUpRow): NotificationRow | null {
  if (!row.scheduled_at || !isOpenStatus(row.status) || new Date(row.scheduled_at).getTime() > Date.now()) return null;
  return { id: `derived:follow-up:${row.id}:${row.scheduled_at}`, type: 'overdue_follow_up', title: 'Overdue follow-up', body: row.notes || 'A lead follow-up is past due and needs attention.', icon: 'clock-o', priority: 'high', entity_ref: row.lead_id ? `lead:${row.lead_id}` : 'Follow-up', action_url: row.lead_id ? `/leads?focus=${encodeURIComponent(row.lead_id)}` : '/leads?view=overdue', read: false, created_at: row.scheduled_at, source: 'derived' };
}

function derivedTaskAlert(row: ScheduledTaskRow): NotificationRow | null {
  if (!row.scheduled_for || !isOpenStatus(row.status) || new Date(row.scheduled_for).getTime() > Date.now()) return null;
  const taskLabel = row.task_type ? row.task_type.replace(/_/g, ' ') : 'scheduled task';
  return { id: `derived:task:${row.id}:${row.scheduled_for}`, type: 'overdue_task', title: 'Overdue task', body: `${taskLabel} is past due and needs attention.`, icon: 'exclamation-circle', priority: 'high', entity_ref: row.lead_id ? `lead:${row.lead_id}` : 'Task', action_url: row.lead_id ? `/leads?focus=${encodeURIComponent(row.lead_id)}` : '/tasks', read: false, created_at: row.scheduled_for, source: 'derived' };
}

export function InAppNotificationCenter({ organizationId, userId, variant = 'floating' }: { organizationId: string; userId: string; variant?: 'floating' | 'inline' | 'page' }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [iosDevice, setIosDevice] = useState(false);
  const [standalonePwa, setStandalonePwa] = useState(false);
  const [dismissedDerived, setDismissedDerived] = useState<Set<string>>(() => new Set());
  const unread = useMemo(() => notifications.filter((notification) => !notification.read), [notifications]);
  const unreadCount = unread.length;
  const groupedNotifications = useMemo(() => groupNotifications(notifications), [notifications]);

  useEffect(() => { setDismissedDerived(readDismissedDerivedAlerts()); }, []);

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
        const [storedResult, followUpResult, taskResult] = await Promise.all([
          supabase.from('notifications').select('id,type,title,body,icon,priority,entity_ref,action_url,read,created_at').eq('organization_id', organizationId).is('archived_at', null).order('created_at', { ascending: false }).limit(12),
          supabase.from('lead_follow_ups').select('id,lead_id,scheduled_at,status,notes').eq('organization_id', organizationId).order('scheduled_at', { ascending: true }).limit(24),
          supabase.from('scheduled_tasks').select('id,lead_id,task_type,scheduled_for,status').eq('organization_id', organizationId).order('scheduled_for', { ascending: true }).limit(24),
        ]);
        if (cancelled) return;
        const stored = (storedResult.error ? [] : storedResult.data ?? []).map((row) => ({ ...row, source: 'stored' as const }));
        const derived = [
          ...((followUpResult.error ? [] : followUpResult.data ?? []).map(derivedFollowUpAlert).filter((row): row is NotificationRow => row !== null)),
          ...((taskResult.error ? [] : taskResult.data ?? []).map(derivedTaskAlert).filter((row): row is NotificationRow => row !== null)),
        ].filter((row) => !dismissedDerived.has(row.id));
        setNotifications([...derived, ...stored].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 60000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [dismissedDerived, organizationId]);

  const markRead = async (notificationId: string) => {
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
    if (notificationId.startsWith('derived:')) {
      setDismissedDerived((current) => {
        const next = new Set(current);
        next.add(notificationId);
        saveDismissedDerivedAlerts(next);
        return next;
      });
      return;
    }
    const supabase = createClient() as unknown as NotificationClient;
    await supabase.from('notifications').update?.({ read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
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

  async function handleNotificationClick(notification: NotificationRow) {
    const href = routeForNotification(notification);
    await markRead(notification.id);
    if (href) window.location.assign(href);
  }

  function renderList(page = false) {
    if (loading) return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading alerts...</div>;
    if (groupedNotifications.length === 0) return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><p className="text-sm font-bold text-slate-900">No active alerts found</p><p className="mt-1 text-xs leading-5 text-slate-500">No generated notifications, overdue follow-ups, or overdue tasks are visible for this workspace right now.</p></div>;
    return <div className="space-y-4">{groupedNotifications.map(({ group, items }) => <section key={group} className={cn('space-y-2', page ? 'rounded-[1.75rem] bg-white/80 p-3 shadow-xl shadow-blue-950/5 dark:bg-slate-900/85' : undefined)}><div className="flex items-center gap-2 px-1"><span className="grid h-7 w-7 place-items-center rounded-xl bg-slate-100 text-slate-600"><FaIcon icon={groupIcons[group]} fixedWidth /></span><h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group}</h3><span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{items.length}</span></div>{items.map((notification) => { const entityLabel = visibleEntityLabel(notification); const hasRoute = Boolean(routeForNotification(notification)); return <button key={notification.id} type="button" onClick={() => handleNotificationClick(notification)} className={cn('group w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(15,23,42,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c7fff]', notification.read ? 'border-slate-100 bg-white' : 'border-[#0c7fff]/20 bg-[#f4f9ff]', page ? 'bg-white/95 dark:border-slate-800 dark:bg-slate-950/70' : undefined)} aria-label={hasRoute ? `Open ${notification.title}` : `Dismiss ${notification.title}`}><div className="flex items-start gap-3"><div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', getPriorityClasses(notification.priority))}><FaIcon icon={notification.icon || groupIcons[group]} fixedWidth /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-bold text-slate-950 dark:text-white">{notification.title}</p><span className="shrink-0 text-[11px] font-semibold text-slate-400">{formatWhen(notification.created_at)}</span></div>{notification.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{notification.body}</p> : null}<div className="mt-2 flex flex-wrap items-center gap-2"><span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]', getPriorityClasses(notification.priority))}>{priorityCopy[notification.priority]}</span>{notification.source === 'derived' ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Live signal</span> : null}{entityLabel ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{entityLabel}</span> : null}<span className="ml-auto text-[11px] font-black text-[#0c7fff] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">{hasRoute ? 'Open' : 'Dismiss'}</span></div></div></div></button>; })}</section>)}</div>;
  }

  const pushLabel = pushStatus === 'enabled' ? 'Push on' : pushStatus === 'saving' ? 'Saving...' : pushStatus === 'error' ? 'Retry push' : 'Enable push';
  const mobilePushHint = iosDevice && !standalonePwa ? 'On iPhone/iPad, add SETU Flow to your Home Screen first, then open the app icon to enable push alerts.' : pushStatus === 'missing-key' ? 'Browser push setup is pending, but in-app alerts are active.' : pushStatus === 'denied' ? 'Push is blocked in this browser. In-app alerts still appear here.' : 'Tap an alert to open the related record. Opening an alert marks it read.';
  const showPushButton = pushStatus === 'idle' || pushStatus === 'saving' || pushStatus === 'enabled' || pushStatus === 'error';

  if (variant === 'page') return <div className="space-y-3"><div className="rounded-[1.75rem] bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-xl shadow-emerald-950/10">All mobile work is synced</div><p className="px-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">{mobilePushHint}</p>{renderList(true)}</div>;

  const bellAndPanel = (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:text-[#0b2e4a]" aria-label="Open notifications" aria-expanded={open}>
        <FaIcon icon="bell-o" fixedWidth />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#0c7fff] px-1 text-[10px] font-black text-white ring-2 ring-white">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>
      {open ? <section className="fixed inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-[1.75rem] border border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-28px_70px_rgba(15,23,42,0.24)] ring-1 ring-slate-950/5 md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:mt-2 md:w-[min(380px,calc(100vw-2rem))] md:rounded-[1.35rem] md:pb-0 md:shadow-[0_28px_70px_rgba(15,23,42,0.22)]"><div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" aria-hidden="true" /><div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0c7fff]">Notifications</p><h2 className="text-sm font-bold text-slate-950">{unreadCount ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}</h2><p className="mt-1 max-w-[18rem] text-[11px] leading-5 text-slate-500 md:hidden">{mobilePushHint}</p></div><div className="flex shrink-0 items-center gap-2">{showPushButton ? <button type="button" onClick={enablePush} disabled={pushStatus === 'saving' || pushStatus === 'enabled'} className={cn('rounded-xl border px-3 py-2 text-[11px] font-bold transition', pushStatus === 'enabled' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')} title="Enable browser push notifications">{pushLabel}</button> : null}<button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close notifications">x</button></div></div><div className="max-h-[58vh] overflow-y-auto p-2 md:max-h-[420px]">{renderList()}</div></section> : null}
    </div>
  );

  if (variant === 'inline') return <>{bellAndPanel}</>;

  return <div className="pointer-events-none fixed inset-x-4 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[340] flex flex-col items-end gap-3 md:hidden"><div className="pointer-events-auto relative flex w-full justify-end" /></div>;
}
