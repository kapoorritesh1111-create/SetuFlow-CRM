"""One-shot, exact-source editing helper. Removed before the release PR is merged."""
from pathlib import Path
import hashlib


def load(path, expected=None):
    p = Path(path)
    raw = p.read_bytes()
    if expected:
        actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        assert actual == expected, (path, actual)
    return raw.decode()


def replace(text, old, new, count=1):
    assert text.count(old) == count, (old[:120], text.count(old), count)
    return text.replace(old, new)


mail_path = 'src/features/mail/components/mobile-setu-mail-workspace.tsx'
s = load(mail_path, '837b900c113690b6ff08c720edf56c25be056050')
s = replace(s, 'FolderInput, Inbox,', 'FolderInput, Home, Inbox,')
s = replace(s, "import { RichMailEditor } from './rich-mail-editor';", "import { RichMailEditor } from './rich-mail-editor';\nimport { MobileCommunicationDrawer, MobileMailboxSelector } from '@/components/layout/mobile-communication-drawer';\nimport mobileStyles from '@/components/layout/mobile-communication-surfaces.module.css';")
s = replace(s, 'className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur"', 'className={`${mobileStyles.header} sticky z-20 border-b bg-white/95 backdrop-blur`}', 2)
s = replace(s, 'className="fixed inset-0 z-[500] flex flex-col bg-white md:hidden"', 'className={`${mobileStyles.fullScreen} fixed inset-0 z-[500] flex flex-col bg-white md:hidden`}')
s = replace(s, '<div className="flex items-center gap-3 px-4 pb-2 pt-3"><div className="min-w-0 flex-1">', '<div className="flex items-center gap-2 px-3 pb-2 pt-3"><button type="button" className={mobileStyles.iconButton} onClick={()=>setFoldersOpen(true)} aria-label="Open mail folders and accounts" aria-haspopup="dialog" aria-expanded={foldersOpen}><Home size={22}/></button><div className="min-w-0 flex-1">')
s = replace(s, '<div className="text-[22px] font-black">Setu Mail</div>', '<div className="text-[22px] font-bold">{customFolderId ? organizer.folders.find(item=>item.id===customFolderId)?.name || "Folder" : [...topFolders,...moreFolders].find(([key])=>key===folder)?.[1] || "Setu Mail"}</div>')
s = replace(s, '<button onClick={()=>setSearchOpen(v=>!v)} className="rounded-full p-2">', '<button type="button" onClick={()=>setSearchOpen(v=>!v)} className={mobileStyles.iconButton} aria-label="Search mail" aria-expanded={searchOpen}>')
s = replace(s, '<button onClick={()=>setFoldersOpen(v=>!v)} className="rounded-full p-2">', '<button type="button" onClick={()=>setFoldersOpen(v=>!v)} className={mobileStyles.iconButton} aria-label="Mail options" aria-haspopup="dialog" aria-expanded={foldersOpen}>')
s = replace(s, '<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search entire mailbox"', '<input autoFocus aria-label="Search entire mailbox" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search entire mailbox"')
start = s.index('{foldersOpen?<div className="max-h-[65vh]')
end = s.index('</div>{notice?', start)
old = s[start:end]
assert old.endswith(':null}')
drawer = '''{foldersOpen?<MobileCommunicationDrawer title="Mail folders" subtitle={mailboxAddress} onClose={()=>setFoldersOpen(false)}><MobileMailboxSelector/><nav className={mobileStyles.folderRows} aria-label="Mailbox folders">{[...topFolders,...moreFolders].map(([key,label,Icon])=><button type="button" key={key} className={mobileStyles.row} onClick={()=>switchFolder(key)} aria-label={`Open ${label} folder`} aria-current={!customFolderId&&folder===key?'page':undefined}><Icon size={21}/><span>{label}</span>{(data.counts[key]??0)>0?<span className={mobileStyles.count}>{data.counts[key]}</span>:null}</button>)}</nav>{data.mailbox?<><span className={mobileStyles.sectionLabel}>Custom folders and rules</span><MailFolderSidebar organizer={organizer} activeId={customFolderId} onSelect={id=>{setCustomFolderId(id);setFoldersOpen(false);setSearch('');}} onDeleted={id=>{if(customFolderId===id)switchFolder('inbox');}}/></>:null}</MobileCommunicationDrawer>:null}'''
s = s[:start] + drawer + s[end:]
Path(mail_path).write_text(s)

cal_path = 'src/features/calendar/components/mobile-calendar-workspace.tsx'
s = load(cal_path, 'f55c5c0a762c009cdf92f74544723c91f9e5a492')
s = replace(s, 'CalendarDays, Menu, Search, X', 'CalendarDays, Search, Settings2, X')
s = replace(s, "import { CalendarPeopleInput } from './calendar-people-input';", "import { CalendarPeopleInput } from './calendar-people-input';\nimport { MobileCommunicationDrawer } from '@/components/layout/mobile-communication-drawer';\nimport mobileStyles from '@/components/layout/mobile-communication-surfaces.module.css';")
s = replace(s, '<header className="sticky top-0 z-30 shadow-sm">', '<header className={`${mobileStyles.header} sticky z-30 shadow-sm`}>')
s = replace(s, 'className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Open calendar menu"><Menu size={22} />', 'className={mobileStyles.iconButton} aria-label="Open calendar menu" aria-haspopup="dialog" aria-expanded={menuOpen}><CalendarDays size={22} />')
s = replace(s, 'className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Search calendar"', 'className={mobileStyles.iconButton} aria-label="Search calendar" aria-expanded={searchOpen}')
s = replace(s, '<div className="grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-white/15"><CalendarDays size={16} /></div>', '<Link href="/calendar/settings" className={mobileStyles.iconButton} aria-label="Calendar settings"><Settings2 size={21}/></Link>')
s = replace(s, '<input autoFocus value={search}', '<input autoFocus aria-label="Search calendar events" value={search}')
start = s.index('        {menuOpen ? <div className="absolute left-3 top-12')
end = s.index('\n', start)
s = s[:start] + '''        {menuOpen ? <MobileCommunicationDrawer title="Calendar" subtitle="Setu Calendar" onClose={()=>setMenuOpen(false)}><span className={mobileStyles.sectionLabel}>My calendar</span><button type="button" className={mobileStyles.row} onClick={()=>scrollToDate(today)}><CalendarDays size={22}/><span>Calendar - today's schedule</span></button><span className={mobileStyles.sectionLabel}>Settings and tools</span><Link href="/calendar/settings" className={mobileStyles.row} onClick={()=>setMenuOpen(false)}><Settings2 size={22}/><span>Calendar settings</span></Link><Link href="/calendar/booking" className={mobileStyles.row} onClick={()=>setMenuOpen(false)}>Booking page</Link><p className={mobileStyles.hint}>Only calendars available in your Setu workspace are shown.</p></MobileCommunicationDrawer> : null}''' + s[end:]
s = replace(s, 'className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm"', 'className={`${mobileStyles.fullScreen} fixed inset-0 z-[500] overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm`}')
# Select the clicked recurrence, not simply the first event in the series.
s = replace(s, 'const target = events.find(event => event.id === eventId || event.source_event_id === eventId);', "const occurrence = params.get('occurrenceStart');\n    const target = events.find(event => (event.id === eventId || event.source_event_id === eventId) && (!occurrence || new Date(event.starts_at).getTime() === new Date(occurrence).getTime()));")
Path(cal_path).write_text(s)

path = 'src/components/notifications/communication-notifications.tsx'
s = load(path, '95d3b8b54b5d378aa7bba397cf5b1a7610d65d74')
s = replace(s, 'created_at: string };', 'created_at: string; occurrence_start?: string | null; related_ids?: string[] };')
s = replace(s, 'const [unreadCount, setUnreadCount] = useState(0);', "const [unreadCount, setUnreadCount] = useState(0);\n  const [feedTimezone, setFeedTimezone] = useState('UTC');")
start = s.index('      // Filter in the database BEFORE the limit.')
end = s.index('      if (result.error)', start)
s = s[:start] + """      // The invoker RPC scopes by auth.uid(), active membership, occurrence date
      // and Calendar timezone BEFORE deduplication, count and page limit.
      const result = await db.rpc('setu_communication_notifications_today', {
        p_organization_id: organizationId,
        p_device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        p_limit: 50,
      });
""" + s[end:]
s = replace(s, 'setItems((result.data || []) as Notice[]);\n        setUnreadCount(result.count ?? result.data?.length ?? 0);', "setItems((result.data?.items || []) as Notice[]);\n        setUnreadCount(Number(result.data?.unreadCount || 0));\n        setFeedTimezone(String(result.data?.timezone || 'UTC'));")
s = replace(s, ".eq('id', notice.id).eq('organization_id', organizationId)", ".in('id', notice.related_ids?.length ? notice.related_ids : [notice.id]).eq('organization_id', organizationId)")
s = replace(s, "<p>{unreadCount ? `${unreadCount} unread` : 'Your communication alerts'}</p>", "<p>{unreadCount ? `${unreadCount} unread` : 'Your communication alerts'}</p><p>Today's calendar reminders - {feedTimezone}</p>")
s = replace(s, '{notice.body ? <p>{notice.body}</p> : null}', "{notice.occurrence_start ? <p>{new Intl.DateTimeFormat(undefined, { timeZone: feedTimezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notice.occurrence_start))} - {feedTimezone}</p> : notice.body ? <p>{notice.body}</p> : null}")
Path(path).write_text(s)

path = 'src/components/notifications/communication-notifications.module.css'
s = load(path)
s += '\n@media (max-width: 767px) { .dialog { inset: auto 0 0; width: 100vw; max-width: 100vw; max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 8px); box-sizing: border-box; } }\n'
Path(path).write_text(s)

path = 'src/app/api/calendar/reminders/process/route.ts'
s = load(path, '9d3e679a0c811f4559a2846ce220fc74bfe590c8')
s = replace(s, "import { expandRecurringEvent } from '@/lib/calendar/recurrence';", "import { expandRecurringEvent } from '@/lib/calendar/recurrence';\nimport { isCalendarReminderDue } from '@/lib/calendar/reminder-window';")
s = replace(s, "      const due = new Date(occurrence.getTime() - Number(reminder.minutes_before || 0) * 60000);\n      if (due > now || occurrence < window.from) continue;", "      if (!isCalendarReminderDue(occurrenceStart, Number(reminder.minutes_before || 0), now)) continue;")
s = replace(s, "actionUrl: `/calendar?eventId=${encodeURIComponent(event.id)}`", "actionUrl: `/calendar?eventId=${encodeURIComponent(event.id)}&occurrenceStart=${encodeURIComponent(occurrenceIso)}`")
Path(path).write_text(s)

path = 'src/app/(app)/calendar/settings/page.tsx'
s = load(path, 'e595bfeacfca8ea54928176064d08b1b9abac770')
s = "import mobileStyles from '@/components/layout/mobile-communication-surfaces.module.css';\n" + s
s = replace(s, 'return <CalendarSettingsWorkspace />;', 'return <div className={`${mobileStyles.settingsPage} pb-24 md:pb-0`}><CalendarSettingsWorkspace /></div>;')
Path(path).write_text(s)
path = 'src/components/layout/mobile-communication-surfaces.module.css'
s = load(path) + '\n@media (max-width: 767px) { .settingsPage { padding-top: var(--setu-safe-top, env(safe-area-inset-top, 0px)); } }\n'
Path(path).write_text(s)
print('Applied exact-source mobile patches. No mailbox/calendar lifecycle handlers were replaced.')
