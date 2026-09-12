'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, Mail, X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { COMMUNICATION_NOTIFICATION_TYPES, COMMUNICATION_PUSH_SCOPE, communicationActionUrl, communicationWorkerScope, waitForPushWorker } from '@/lib/notifications/communication-scope';
import styles from './communication-notifications.module.css';

type Props = { organizationId: string; userId: string; mobile?: boolean };
type Notice = { id: string; type: string; title: string; body: string | null; action_url: string | null; created_at: string; occurrence_start?: string | null; related_ids?: string[] };
type PushState = 'checking' | 'idle' | 'saving' | 'enabled' | 'install' | 'unsupported' | 'denied' | 'missing-key' | 'error';
const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || '';

function decodeApplicationServerKey(value: string) {
  const raw = window.atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}
function subscriptionUsesPublicKey(subscription: PushSubscription, value: string) {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const expected = decodeApplicationServerKey(value);
  const actual = new Uint8Array(current);
  return actual.length === expected.length && actual.every((byte, index) => byte === expected[index]);
}

export function CommunicationNotifications(props: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setVisible(media.matches === Boolean(props.mobile));
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [props.mobile]);
  return visible ? <NotificationCenter key={`${props.organizationId}:${props.userId}`} {...props} /> : null;
}

function NotificationCenter({ organizationId, userId, mobile = false }: Props) {
  const client = useMemo(() => createClient(), []);
  const db = client as unknown as SupabaseClient;
  const [items, setItems] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedTimezone, setFeedTimezone] = useState('UTC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [push, setPush] = useState<PushState>('checking');
  const [pushError, setPushError] = useState('');
  const [standalone, setStandalone] = useState(false);
  const [snoozed, setSnoozed] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const mounted = useRef(true);
  const requestVersion = useRef(0);
  const scope = communicationWorkerScope(organizationId, userId);
  const snoozeKey = `setu-mail-notifications:${organizationId}:${userId}`;

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const result = await db.rpc('setu_communication_notifications_today', {
        p_organization_id: organizationId,
        p_device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        p_limit: 50,
      });
      if (result.error) throw result.error;
      if (mounted.current && version === requestVersion.current) {
        setItems((result.data?.items || []) as Notice[]);
        setUnreadCount(Number(result.data?.unreadCount || 0));
        setFeedTimezone(String(result.data?.timezone || 'UTC'));
        setError('');
      }
    } catch {
      if (mounted.current && version === requestVersion.current) setError('Notifications could not be loaded. Please retry.');
    } finally {
      if (mounted.current && version === requestVersion.current) setLoading(false);
    }
  }, [db, organizationId, userId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const message = (event: MessageEvent) => { if (event.data?.type === 'SETU_MAIL_NOTIFICATION') refresh(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    navigator.serviceWorker?.addEventListener('message', message);
    return () => {
      mounted.current = false;
      ++requestVersion.current;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      navigator.serviceWorker?.removeEventListener('message', message);
    };
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setStandalone(isStandalone);
    try { setSnoozed(Number(localStorage.getItem(snoozeKey) || 0) > Date.now()); } catch { setSnoozed(false); }
    if (ios && !isStandalone) { setPush('install'); return; }
    if (!window.isSecureContext || !('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) { setPush('unsupported'); return; }
    if (!publicKey) { setPush('missing-key'); return; }
    if (Notification.permission === 'denied') { setPush('denied'); return; }
    const setup = async () => {
      try {
        const worker = await navigator.serviceWorker.register('/setu-mail-sw.js', { scope, updateViaCache: 'none' });
        await waitForPushWorker(worker);
        if (cancelled) return;
        registration.current = worker;
        let subscription = await worker.pushManager.getSubscription();
        if (subscription && !subscriptionUsesPublicKey(subscription, publicKey)) {
          const staleEndpoint = subscription.endpoint;
          await db.from('push_subscriptions').delete().eq('organization_id', organizationId).eq('user_id', userId).eq('app_scope', COMMUNICATION_PUSH_SCOPE).eq('endpoint', staleEndpoint);
          await subscription.unsubscribe();
          subscription = null;
        }
        if (!subscription) { setPush('idle'); return; }
        const saved = await db.from('push_subscriptions').select('id').eq('organization_id', organizationId).eq('user_id', userId).eq('app_scope', COMMUNICATION_PUSH_SCOPE).eq('endpoint', subscription.endpoint).maybeSingle();
        if (saved.error) throw saved.error;
        if (!cancelled) setPush(saved.data && Notification.permission === 'granted' ? 'enabled' : 'idle');
      } catch { if (!cancelled) setPush('error'); }
    };
    void setup();
    return () => { cancelled = true; };
  }, [db, organizationId, userId, scope, snoozeKey]);

  useEffect(() => {
    const { data } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') void registration.current?.pushManager.getSubscription().then(subscription => subscription?.unsubscribe()).catch(() => undefined);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  const enablePush = async () => {
    if (push === 'saving' || push === 'enabled') return;
    setPushError(''); setPush('saving');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPush(permission === 'denied' ? 'denied' : 'idle'); return; }
      const worker = registration.current || await navigator.serviceWorker.register('/setu-mail-sw.js', { scope, updateViaCache: 'none' });
      await waitForPushWorker(worker); registration.current = worker;
      const applicationServerKey = decodeApplicationServerKey(publicKey);
      let subscription = await worker.pushManager.getSubscription();
      if (subscription && !subscriptionUsesPublicKey(subscription, publicKey)) {
        const staleEndpoint = subscription.endpoint;
        await db.from('push_subscriptions').delete().eq('organization_id', organizationId).eq('user_id', userId).eq('app_scope', COMMUNICATION_PUSH_SCOPE).eq('endpoint', staleEndpoint);
        await subscription.unsubscribe(); subscription = null;
      }
      subscription = subscription || await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const json = subscription.toJSON();
      if (!json.keys?.auth || !json.keys?.p256dh) throw new Error('The device did not return a valid notification subscription.');
      const current = await db.from('push_subscriptions').select('id').eq('organization_id', organizationId).eq('user_id', userId).eq('endpoint', subscription.endpoint).maybeSingle();
      if (current.error) throw current.error;
      const values = { auth_key: json.keys.auth, p256dh: json.keys.p256dh, user_agent: navigator.userAgent, app_scope: COMMUNICATION_PUSH_SCOPE, last_seen_at: new Date().toISOString() };
      const saved = current.data
        ? await db.from('push_subscriptions').update(values).eq('id', current.data.id).eq('organization_id', organizationId).eq('user_id', userId)
        : await db.from('push_subscriptions').insert({ ...values, organization_id: organizationId, user_id: userId, endpoint: subscription.endpoint });
      if (saved.error) throw saved.error;
      if (mounted.current) { setPush('enabled'); setSnoozed(true); }
    } catch {
      if (mounted.current) { setPush('error'); setPushError('Could not finish notification setup. Check your connection and retry.'); }
    }
  };

  const markRead = async (notice: Notice) => {
    const result = await db.from('notifications').update({ read: true, read_at: new Date().toISOString() })
      .in('id', notice.related_ids?.length ? notice.related_ids : [notice.id]).eq('organization_id', organizationId).eq('user_id', userId)
      .in('type', [...COMMUNICATION_NOTIFICATION_TYPES]);
    if (result.error) setError('The alert could not be marked read. It will remain in your notifications.'); else await load();
  };
  const clearAll = async () => {
    const ids = [...new Set(items.flatMap(item => item.related_ids?.length ? item.related_ids : [item.id]))];
    if (!ids.length) return;
    const result = await db.from('notifications').update({ read: true, read_at: new Date().toISOString() })
      .in('id', ids).eq('organization_id', organizationId).eq('user_id', userId).in('type', [...COMMUNICATION_NOTIFICATION_TYPES]);
    if (result.error) setError('Notifications could not be cleared. Please retry.');
    else await load();
  };
  const dismissNudge = () => {
    setSnoozed(true);
    try { localStorage.setItem(snoozeKey, String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch {}
  };
  const canEnable = ['idle', 'saving', 'error'].includes(push);
  const hint = push === 'install' ? 'On iPhone, use Share > Add to Home Screen. Open the SETU Mail icon, then tap Enable notifications.'
    : push === 'denied' ? 'Notifications are blocked for this app. Allow SETU Mail in your phone or browser notification settings, then reopen the app.'
    : push === 'missing-key' ? 'Device notifications need administrator setup. Mail and Calendar alerts are still available here.'
    : push === 'unsupported' ? 'Device notifications are not available in this browser. Your Mail and Calendar alerts are still available here.'
    : push === 'enabled' ? 'This device is subscribed to new-mail and calendar-reminder alerts only.'
    : push === 'checking' ? 'Checking notification setup on this device...'
    : 'Get new-mail alerts and meeting reminders, even when SETU Mail is closed. No CRM or SMC alerts.';
  const button = <button type="button" className={styles.primary} onClick={() => void enablePush()} disabled={push === 'saving'}>{push === 'saving' ? 'Enabling...' : push === 'error' ? 'Retry notifications' : 'Enable notifications'}</button>;
  const visibleItems = items.filter(item => filter === 'all' || item.type === filter);

  return <>
    <button type="button" className={mobile ? styles.tabTrigger : styles.trigger} aria-label={`Mail and Calendar notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span className={styles.icon}><Bell size={21} />{unreadCount > 0 ? <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span> : null}</span>
      {mobile ? <span>Notifications</span> : null}
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-label="Mail and Calendar notifications" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className={styles.header}><div><h2>Mail &amp; Calendar notifications</h2><p>{unreadCount ? `${unreadCount} unread` : 'Your communication alerts'}</p><p>Today's calendar reminders - {feedTimezone}</p></div><div className={styles.actions}>{unreadCount > 0 ? <button type="button" className={styles.secondary} onClick={() => void clearAll()}>Clear all</button> : null}<button type="button" className={styles.close} aria-label="Close notifications" onClick={() => setOpen(false)}><X size={20} /></button></div></div>
      <div className={styles.setup}><strong>{push === 'enabled' ? 'Notifications enabled' : 'Notifications on this device'}</strong><p>{hint}</p>{canEnable ? <div className={styles.actions}>{button}</div> : null}{pushError ? <p className={styles.error} role="alert">{pushError}</p> : null}</div>
      <div className={styles.filters} aria-label="Filter communication notifications">{[['all', 'All'], ['mail_received', 'Mail'], ['calendar_reminder', 'Calendar']].map(([value, label]) => <button type="button" key={value} className={styles.filter} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
      <div className={styles.list}>
        {error ? <div role="alert"><p className={styles.error}>{error}</p><button type="button" className={styles.secondary} onClick={() => void load()}>Retry</button></div> : null}
        {loading ? <p className={styles.empty} role="status">Loading notifications...</p> : !error && !visibleItems.length ? <p className={styles.empty}>All caught up.<br />New mail and calendar reminders will appear here.</p> : null}
        {visibleItems.map(notice => <a className={styles.card} key={notice.id} href={communicationActionUrl(notice.type, notice.action_url)} onClick={event => { event.preventDefault(); void markRead(notice).catch(() => undefined).finally(() => window.location.assign(communicationActionUrl(notice.type, notice.action_url))); }}>
          {notice.type === 'calendar_reminder' ? <CalendarDays size={20} /> : <Mail size={20} />}<span><strong>{notice.title}</strong>{notice.occurrence_start ? <p>{new Intl.DateTimeFormat(undefined, { timeZone: feedTimezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notice.occurrence_start))} - {feedTimezone}</p> : notice.body ? <p>{notice.body}</p> : null}<time dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></span>
        </a>)}
      </div>
    </dialog>
    {mobile && standalone && !snoozed && !open && canEnable ? <aside className={styles.nudge} aria-label="Enable SETU Mail notifications"><strong>Stay on top of mail and meetings</strong><p>Enable new-mail alerts and calendar reminders on this phone.</p><div className={styles.actions}>{button}<button type="button" className={styles.secondary} onClick={dismissNudge}>Not now</button></div></aside> : null}
  </>;
}
