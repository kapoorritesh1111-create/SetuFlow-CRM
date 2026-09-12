from pathlib import Path
import re
import subprocess

BASE = 'f1e75da9802a45d3e0ed1f10d5e500c1ba1f54a5'

def read(path):
    original = subprocess.check_output(['git', 'show', BASE + ':' + path])
    assert Path(path).read_bytes() == original, 'Source changed: ' + path
    return original.decode()

def replace(text, before, after, count=1):
    assert text.count(before) == count, (before[:90], text.count(before), count)
    return text.replace(before, after)

COLORS = {
    'bg-white/95': 'bg-surface-1', 'bg-white': 'bg-surface-1',
    'bg-blue-50/30': 'bg-surface-2', 'bg-blue-50': 'bg-surface-2',
    'bg-slate-50': 'bg-surface-2', 'bg-slate-100': 'bg-surface-2', 'bg-slate-200': 'bg-surface-3',
    'bg-slate-900': 'bg-brand-800', 'bg-slate-950': 'bg-brand-800',
    'bg-blue-600': 'bg-brand-700', 'bg-violet-700': 'bg-brand-700', 'bg-violet-50': 'bg-surface-2',
    'bg-[#0b72bb]': 'bg-brand-800', 'bg-[#0f5b99]': 'bg-brand-700',
    'bg-[#0b2e4a]': 'bg-brand-800', 'bg-[#f7f8fa]': 'bg-surface-app', 'bg-[#dceafa]': 'bg-surface-2',
    'text-[#0b72bb]': 'text-content-accent', 'text-[#164f7d]': 'text-content-primary',
    'text-[#416781]': 'text-content-secondary', 'border-[#0b72bb]': 'border-accent-500',
    'font-black': 'font-bold', 'font-extrabold': 'font-bold',
    'shadow-[0_8px_20px_rgba(2,82,145,.35)]': 'shadow-card',
}
for tone in [50,100,200,300,400,500,600,700,800,900,950]:
    COLORS['text-slate-' + str(tone)] = 'text-content-primary' if tone >= 800 else ('text-content-secondary' if tone >= 600 else 'text-content-muted')
    COLORS['border-slate-' + str(tone)] = 'border-line'
    COLORS['text-blue-' + str(tone)] = 'text-content-accent'
    COLORS['text-violet-' + str(tone)] = 'text-content-accent'
    COLORS['border-blue-' + str(tone)] = 'border-accent-500'
    COLORS['border-violet-' + str(tone)] = 'border-line'
for raw, semantic in [('rose','danger'),('emerald','success'),('amber','warning')]:
    for tone in [50,100,200,300,400,500,600,700,800,900]:
        COLORS['text-'+raw+'-'+str(tone)] = 'text-'+semantic+'-fg'
        COLORS['bg-'+raw+'-'+str(tone)] = 'bg-'+semantic+'-bg'
        COLORS['border-'+raw+'-'+str(tone)] = 'border-'+semantic+'-border'
pattern = re.compile(r'(?<![\w-])('+'|'.join(map(re.escape,sorted(COLORS,key=len,reverse=True)))+r')(?![\w/-])')

def theme(text):
    text = pattern.sub(lambda m: COLORS[m[0]], text)
    return re.sub(r'(?<![\w-])(border|border-b|border-t|divide-y)(?![\w-])', lambda m: m[0] + (' divide-line' if m[0]=='divide-y' else ' border-line'), text)

def add_import(text):
    return replace(text, "'use client';", "'use client';\n\nimport themeStyles from '@/components/layout/communication-theme.module.css';")

mail = 'src/features/mail/components/mobile-setu-mail-workspace.tsx'
s = theme(add_import(read(mail)))
s,n = re.subn(r'return <div className="([^"\n]+)"', lambda m: 'return <div className={`${themeStyles.scope} '+m[1]+'`}', s)
assert n==2,n
s = replace(s, '${mobileStyles.fullScreen}', '${themeStyles.scope} ${mobileStyles.fullScreen}')
s = replace(s, 'className="mail-rich-reader mt-7 break-words text-[15px] leading-7 text-content-secondary"', 'className={`${themeStyles.htmlMessage} mail-rich-reader mt-7 break-words text-[15px] leading-7`}')
Path(mail).write_text(s)

cal = 'src/features/calendar/components/mobile-calendar-workspace.tsx'
s = theme(add_import(read(cal)))
s = replace(s, 'return <div className="min-h-screen bg-surface-1 pb-24 text-content-primary md:hidden">', 'return <div className={`${themeStyles.scope} min-h-screen bg-surface-1 pb-24 text-content-primary md:hidden`}>')
s = replace(s, '${mobileStyles.fullScreen}', '${themeStyles.scope} ${mobileStyles.fullScreen}')
s = s.replace('border:1px solid rgb(226 232 240)', 'border:1px solid var(--sf-border)').replace('background:white;', 'background:var(--sf-surface-1);').replace('color:rgb(15 23 42)', 'color:var(--sf-text-primary)').replace('border-color:rgb(96 165 250)', 'border-color:var(--sf-action-primary-bg)').replace('0 0 0 3px rgb(219 234 254)', '0 0 0 3px var(--sf-focus-ring)')
Path(cal).write_text(s)

people = 'src/features/contacts/components/mobile-people-workspace.tsx'
s = theme(add_import(read(people)))
s = replace(s, '<div className="min-h-[calc(100vh-4rem)] bg-surface-1 pb-24 text-content-primary md:hidden">', '<div className={`${themeStyles.scope} min-h-[calc(100vh-4rem)] bg-surface-1 pb-24 text-content-primary md:hidden`}>')
s = replace(s, '<header className="sticky top-0 z-30 bg-brand-800 text-white shadow-sm">', '<header className={`${themeStyles.safeHeader} sticky top-0 z-30 bg-brand-800 text-white shadow-sm`}>')
Path(people).write_text(s)

settings = 'src/features/calendar/components/calendar-settings-workspace.tsx'
s = theme(add_import(read(settings)))
s = replace(s, "import themeStyles from '@/components/layout/communication-theme.module.css';", "import themeStyles from '@/components/layout/communication-theme.module.css';\nimport { CommunicationAppearanceControl } from '@/components/layout/communication-appearance-control';")
s = replace(s, 'return <div className="h-full overflow-y-auto bg-surface-app p-5 md:p-8">', 'return <div className={`${themeStyles.scope} h-full overflow-y-auto bg-surface-app p-5 md:p-8`}>')
s = replace(s, '<aside className="space-y-4">', '<aside className="space-y-4"><section className="rounded-panel border border-line bg-surface-1 p-5"><CommunicationAppearanceControl/></section>')
s = replace(s, 'grid-cols-[120px_1fr]', 'grid-cols-2')
s = replace(s, '<label className="flex items-center gap-2 text-xs font-bold text-content-secondary"><input type="checkbox" checked={day.enabled}', '<label className="col-span-2 flex items-center gap-2 text-xs font-bold text-content-secondary sm:col-span-1"><input type="checkbox" checked={day.enabled}')
s = replace(s, '<input type="time" value={day.startTime}', '<input type="time" aria-label={`${DAYS[day.weekday]} start time`} value={day.startTime}')
s = replace(s, '<input type="time" value={day.endTime}', '<input type="time" aria-label={`${DAYS[day.weekday]} end time`} value={day.endTime}')
Path(settings).write_text(s)

path = 'src/components/layout/mobile-communication-drawer.tsx'
s = read(path)
s = replace(s, "import styles from './mobile-communication-surfaces.module.css';", "import styles from './mobile-communication-surfaces.module.css';\nimport { CommunicationAppearanceControl } from './communication-appearance-control';")
s = replace(s, '<div className={styles.drawerContent}>{children}</div>', '<div className={styles.drawerContent}>{children}<CommunicationAppearanceControl/></div>')
Path(path).write_text(s)

path = 'src/components/layout/mobile-communication-surfaces.module.css'
s = replace(read(path), '  background: var(--sf-surface-1);\n}', '  background: var(--sf-surface-1);\n  color: var(--sf-text-primary);\n}',1)
Path(path).write_text(s)

path = 'src/components/layout/mobile-communications-chrome.module.css'
s = read(path)
for before, after in {'#d9e1ea':'var(--sf-border)','rgb(255 255 255 / 0.97)':'var(--sf-surface-1)','#5d6674':'var(--sf-text-secondary)','#f5f8fb':'var(--sf-surface-2)','#0a72c5':'var(--sf-text-accent)','#d92d20':'var(--sf-danger-solid)','border: 2px solid white':'border: 2px solid var(--sf-surface-1)','color: white':'color: var(--sf-action-primary-fg)'}.items():
    assert before in s,before
    s=s.replace(before,after)
Path(path).write_text(s)

path='src/components/layout/mail-product-shell.module.css'
s = replace(read(path), '.shell { min-height: 0; background: transparent; }', '.shell { min-height: 0; background: var(--sf-bg-app); color: var(--sf-text-primary); }')
s = replace(s, '.content { height: auto; overflow: visible; }', '.content { height: auto; overflow: visible; background: var(--sf-surface-1); }')
Path(path).write_text(s)

path='src/components/notifications/communication-notifications.module.css'
s=read(path)
s=replace(s, 'color: var(--sf-text-inverse)', 'color: var(--sf-action-primary-fg)')
s=replace(s, 'background: var(--sf-navy-50)', 'background: var(--sf-surface-3)')
Path(path).write_text(s)
print('Materialized presentation-only theme changes against exact base. No API/auth-session/notification delivery data changed.')
