'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, ExternalLink, Mail, RefreshCw, Save, Video, XCircle } from 'lucide-react';

type AvailabilityRow = { weekday: number; start_time: string; end_time: string; timezone: string; is_active?: boolean };
type DayModel = { weekday: number; enabled: boolean; startTime: string; endTime: string };
type ZoomState = { configured: boolean; connected: boolean; accountEmail?: string | null; status?: string };
type PreferencesPayload = {
  preferences?: { timezone?: string; defaultReminderMinutes?: number; defaultReminderChannels?: string[] };
  communications?: { enabled?: boolean; canManage?: boolean; adminUrl?: string };
};

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const COMMON_TIMEZONES = ['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Dublin','Europe/Sofia','Europe/Tirane','Asia/Dubai','Asia/Kolkata','Asia/Singapore'];
const defaultDays = (): DayModel[] => DAYS.map((_, weekday) => ({ weekday, enabled: weekday >= 1 && weekday <= 5, startTime: '09:00', endTime: '17:00' }));

export function CalendarSettingsWorkspace() {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [days, setDays] = useState<DayModel[]>(defaultDays);
  const [timezone, setTimezone] = useState(browserTimezone);
  const [defaultReminder, setDefaultReminder] = useState(15);
  const [emailReminder, setEmailReminder] = useState(false);
  const [communications, setCommunications] = useState<PreferencesPayload['communications'] | null>(null);
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true); setNotice('');
    try {
      const [availabilityResponse, zoomResponse, preferenceResponse] = await Promise.all([
        fetch('/api/calendar/availability', { cache: 'no-store' }),
        fetch('/api/calendar/zoom', { cache: 'no-store' }),
        fetch('/api/calendar/preferences', { cache: 'no-store' }),
      ]);
      const availabilityPayload = await availabilityResponse.json();
      const zoomPayload = await zoomResponse.json();
      const preferencePayload = await preferenceResponse.json() as PreferencesPayload;
      if (!availabilityResponse.ok) throw new Error(availabilityPayload.error || 'Unable to load working hours.');
      if (!preferenceResponse.ok) throw new Error((preferencePayload as any).error || 'Unable to load Calendar preferences.');
      const rows = Array.isArray(availabilityPayload.availability) ? availabilityPayload.availability as AvailabilityRow[] : [];
      if (rows.length) {
        const byDay = new Map(rows.map(row => [row.weekday, row]));
        setDays(DAYS.map((_, weekday) => {
          const row = byDay.get(weekday);
          return { weekday, enabled: Boolean(row && row.is_active !== false), startTime: row?.start_time?.slice(0,5) || '09:00', endTime: row?.end_time?.slice(0,5) || '17:00' };
        }));
      }
      const preference = preferencePayload.preferences;
      setTimezone(preference?.timezone || rows[0]?.timezone || browserTimezone);
      setDefaultReminder(Number(preference?.defaultReminderMinutes ?? 15));
      setEmailReminder(Boolean(preference?.defaultReminderChannels?.includes('email')));
      setCommunications(preferencePayload.communications || null);
      setZoom(zoomResponse.ok ? { configured: Boolean(zoomPayload.configured), connected: Boolean(zoomPayload.connected), accountEmail: zoomPayload.accountEmail || null, status: zoomPayload.status } : { configured: false, connected: false });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load Calendar settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const enabledCount = useMemo(() => days.filter(day => day.enabled).length, [days]);

  async function saveCalendarSettings() {
    if (saving) return;
    const enabled = days.filter(day => day.enabled);
    if (!enabled.length) { setNotice('Choose at least one work day.'); return; }
    if (enabled.some(day => !day.startTime || !day.endTime || day.endTime <= day.startTime)) { setNotice('Each work day needs a valid start and end time.'); return; }
    setSaving(true); setNotice('');
    try {
      const [availabilityResponse, preferenceResponse] = await Promise.all([
        fetch('/api/calendar/availability', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ timezone, days: enabled.map(day => ({ weekday: day.weekday, startTime: day.startTime, endTime: day.endTime })) }),
        }),
        fetch('/api/calendar/preferences', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ timezone, defaultReminderMinutes: defaultReminder, defaultReminderChannels: emailReminder ? ['in_app','email'] : ['in_app'] }),
        }),
      ]);
      const availabilityPayload = await availabilityResponse.json().catch(() => ({}));
      const preferencePayload = await preferenceResponse.json().catch(() => ({}));
      if (!availabilityResponse.ok) throw new Error(availabilityPayload.error || 'Unable to save working hours.');
      if (!preferenceResponse.ok) throw new Error(preferencePayload.error || 'Unable to save Calendar preferences.');
      setNotice('Calendar settings saved. New events will use this time zone and reminder default.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save Calendar settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center text-sm font-semibold text-slate-400">Loading Calendar settings…</div>;

  return <div className="h-full overflow-y-auto bg-[#f7f8fa] p-5 md:p-8">
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="text-[11px] font-black uppercase tracking-[.14em] text-blue-600">Setu Calendar</div><h1 className="mt-1 text-2xl font-black text-slate-950">Calendar settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Set your canonical time zone, work week, reminder defaults and meeting-provider readiness for Setu Communications.</p></div>
        <div className="flex gap-2"><a href="/calendar/booking" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Booking page</a><a href="/calendar" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Back to calendar</a></div>
      </div>

      {notice ? <div className={`mt-5 rounded-xl border p-3 text-sm font-bold ${notice.includes('saved') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{notice}</div> : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_330px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><CalendarClock size={22} className="text-blue-600"/><h2 className="mt-3 text-base font-black text-slate-950">Time zone & working hours</h2><p className="mt-1 text-xs leading-5 text-slate-500">Events are stored in UTC with this source time zone so wall-clock schedules stay predictable across daylight-saving changes.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">{enabledCount} WORK DAYS</span></div>
          <label className="mt-5 block text-xs font-bold text-slate-600">Calendar time zone<input list="calendar-timezones" value={timezone} onChange={event => setTimezone(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/></label>
          <datalist id="calendar-timezones">{[browserTimezone, ...COMMON_TIMEZONES].filter((value, index, list) => list.indexOf(value) === index).map(value => <option value={value} key={value}/>)}</datalist>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">Browser detected: {browserTimezone}. Use an IANA zone such as Europe/Sofia or America/New_York.</p>
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            {days.map(day => <div key={day.weekday} className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-slate-100 p-3 last:border-b-0 sm:grid-cols-[130px_1fr_1fr]">
              <label className="flex items-center gap-2 text-xs font-black text-slate-700"><input type="checkbox" checked={day.enabled} onChange={event => setDays(current => current.map(item => item.weekday === day.weekday ? { ...item, enabled: event.target.checked } : item))} className="h-4 w-4"/>{DAYS[day.weekday]}</label>
              {day.enabled ? <><input type="time" value={day.startTime} onChange={event => setDays(current => current.map(item => item.weekday === day.weekday ? { ...item, startTime: event.target.value } : item))} className="rounded-lg border border-slate-200 p-2 text-xs font-semibold"/><input type="time" value={day.endTime} onChange={event => setDays(current => current.map(item => item.weekday === day.weekday ? { ...item, endTime: event.target.value } : item))} className="rounded-lg border border-slate-200 p-2 text-xs font-semibold"/></> : <span className="col-span-2 text-xs font-semibold text-slate-400">Not a working day</span>}
            </div>)}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2"><Bell size={17} className="text-blue-600"/><div className="text-sm font-black text-slate-900">Default reminder</div></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Remind me<select value={defaultReminder} onChange={event => setDefaultReminder(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold"><option value={5}>5 minutes before</option><option value={10}>10 minutes before</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={1440}>1 day before</option></select></label><label className="flex items-end gap-2 pb-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={emailReminder} onChange={event => setEmailReminder(event.target.checked)} className="h-4 w-4"/>Also send by email</label></div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">In-app reminders are always enabled. This default applies to new events and can still be changed per event.</p>
          </div>

          <div className="mt-5 flex justify-end"><button onClick={() => void saveCalendarSettings()} disabled={saving || !communications?.enabled} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2e4a] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Save size={16}/>{saving ? 'Saving…' : 'Save Calendar settings'}</button></div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Mail size={22} className="text-blue-600"/><h2 className="mt-3 text-base font-black text-slate-950">Setu Communications</h2>{communications?.enabled ? <><div className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-700"><CheckCircle2 size={16}/>Enabled for this organization</div><p className="mt-2 text-xs leading-5 text-slate-500">Calendar, invitations and email reminders are operating under the organization Communications entitlement.</p></> : <><div className="mt-3 flex items-center gap-2 text-xs font-black text-amber-700"><XCircle size={16}/>Not enabled</div><p className="mt-2 text-xs leading-5 text-slate-500">An owner or admin must enable Setu Communications before Calendar can save settings or send invitations.</p></>}{communications?.canManage ? <a href={communications.adminUrl || '/admin/mail'} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-blue-700">Manage Communications <ExternalLink size={13}/></a> : null}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Video size={22} className="text-blue-600"/><h2 className="mt-3 text-base font-black text-slate-950">Zoom</h2>{!zoom?.configured ? <><div className="mt-3 flex items-center gap-2 text-xs font-black text-amber-700"><XCircle size={16}/>Integration setup required</div><p className="mt-2 text-xs leading-5 text-slate-500">Zoom OAuth is not configured for this Setu environment yet.</p></> : zoom.connected ? <><div className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-700"><CheckCircle2 size={16}/>Connected</div>{zoom.accountEmail ? <p className="mt-2 break-all text-xs font-semibold text-slate-500">{zoom.accountEmail}</p> : null}<a href="/api/calendar/zoom/connect" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700"><RefreshCw size={14}/>Reconnect Zoom</a></> : <><div className="mt-3 flex items-center gap-2 text-xs font-black text-amber-700"><XCircle size={16}/>Not connected</div><p className="mt-2 text-xs leading-5 text-slate-500">Connect your own Zoom account so Setu can create, update and cancel meetings for you.</p><a href="/api/calendar/zoom/connect" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"><Video size={14}/>Connect Zoom</a></>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-900">Public booking</h2><p className="mt-2 text-xs leading-5 text-slate-500">Configure duration, buffer, minimum notice, booking window and meeting type on your booking page.</p><a href="/calendar/booking" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-blue-700">Open booking settings <ExternalLink size={13}/></a></section>
        </aside>
      </div>
    </div>
  </div>;
}
