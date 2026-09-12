from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    assert count == 1, f'{path}: expected one match, found {count}'
    p.write_text(text.replace(old, new, 1))

# 1) Inbox live refresh on push/focus/foreground + 15-second visible safety refresh.
path = 'src/features/mail/components/mobile-setu-mail-workspace.tsx'
replace_once(path,
"  useEffect(() => { void refresh(); }, []);\n",
"  useEffect(() => { void refresh(); }, []);\n  useEffect(() => {\n    const syncInbox = () => { void refresh(); setReloadNonce(value => value + 1); };\n    const onWorkerMessage = (event: MessageEvent) => { if (event.data?.type === 'SETU_MAIL_NOTIFICATION') syncInbox(); };\n    const onVisible = () => { if (document.visibilityState === 'visible') syncInbox(); };\n    const timer = window.setInterval(onVisible, 15000);\n    window.addEventListener('focus', syncInbox);\n    window.addEventListener('pageshow', syncInbox);\n    document.addEventListener('visibilitychange', onVisible);\n    navigator.serviceWorker?.addEventListener('message', onWorkerMessage);\n    return () => {\n      window.clearInterval(timer);\n      window.removeEventListener('focus', syncInbox);\n      window.removeEventListener('pageshow', syncInbox);\n      document.removeEventListener('visibilitychange', onVisible);\n      navigator.serviceWorker?.removeEventListener('message', onWorkerMessage);\n    };\n  }, []);\n")

# 2) Reader back control: explicit 44px target and strong themed contrast.
replace_once(path,
"<button onClick={()=>setSelectedId(null)} className=\"rounded-full p-2\"><ArrowLeft size={20}/></button>",
"<button type=\"button\" aria-label=\"Back to Inbox\" onClick={()=>{setSelectedId(null);setSelectedDetail(null);setSelectedAttachments([]);setIntelligence(null);}} className=\"grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-content-primary active:bg-surface-3\"><ArrowLeft size={22}/></button>")

# 3) Strong unread/read differentiation.
replace_once(path,
"className={`flex border-b border-line ${!message.is_read?'bg-surface-2':''}`}",
"className={`relative flex border-b border-line ${!message.is_read?'border-l-4 border-l-accent-500 bg-info-bg':'bg-surface-1'}`}")
replace_once(path,
"<div className=\"min-w-0 flex-1 truncate text-sm font-bold\">{peer}</div>",
"<div className={`min-w-0 flex-1 truncate text-sm ${message.is_read?'font-medium text-content-secondary':'font-black text-content-primary'}`}>{!message.is_read?<span className=\"mr-2 inline-block h-2 w-2 rounded-full bg-accent-500 align-middle\" aria-label=\"Unread\"/>:null}{peer}</div>")
replace_once(path,
"<div className=\"min-w-0 flex-1 truncate text-sm font-bold text-content-secondary\">{message.subject||'(no subject)'}</div>",
"<div className={`min-w-0 flex-1 truncate text-sm ${message.is_read?'font-medium text-content-muted':'font-black text-content-primary'}`}>{message.subject||'(no subject)'}</div>")
replace_once(path,
"<div className=\"mt-0.5 truncate text-xs text-content-muted\">{message.text_body||''}</div>",
"<div className={`mt-0.5 truncate text-xs ${message.is_read?'text-content-muted':'font-semibold text-content-secondary'}`}>{message.text_body||''}</div>")

# 4) Calendar attachment import action.
replace_once(path,
"import { Archive, ArrowLeft, Download, FileText, FolderInput, Home, Inbox, Mail, MailOpen, MoreHorizontal, Paperclip, PenLine, Reply, ReplyAll, Search, Send, ShieldAlert, Sparkles, Star, Trash2, UserRoundCheck, X } from 'lucide-react';",
"import { Archive, ArrowLeft, CalendarPlus, Download, FileText, FolderInput, Home, Inbox, Mail, MailOpen, MoreHorizontal, Paperclip, PenLine, Reply, ReplyAll, Search, Send, ShieldAlert, Sparkles, Star, Trash2, UserRoundCheck, X } from 'lucide-react';")
replace_once(path,
"function errorText(error: unknown) { return error instanceof Error ? error.message : 'Unable to complete this mail action.'; }\n",
"function errorText(error: unknown) { return error instanceof Error ? error.message : 'Unable to complete this mail action.'; }\nfunction isCalendarAttachment(attachment: Attachment) { return String(attachment.content_type || '').toLowerCase().startsWith('text/calendar') || attachment.filename.toLowerCase().endsWith('.ics'); }\n")
replace_once(path,
"  async function downloadAttachment(id: string) { try { const response = await fetch(`/api/mail/attachments?id=${encodeURIComponent(id)}`); const payload = await response.json(); if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Unable to download attachment.'); window.open(payload.url, '_blank', 'noopener,noreferrer'); } catch (error) { setNotice(`Attachment download failed: ${errorText(error)}`); } }\n",
"  async function downloadAttachment(id: string) { try { const response = await fetch(`/api/mail/attachments?id=${encodeURIComponent(id)}`); const payload = await response.json(); if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Unable to download attachment.'); window.open(payload.url, '_blank', 'noopener,noreferrer'); } catch (error) { setNotice(`Attachment download failed: ${errorText(error)}`); } }\n  async function importCalendarInvite(attachmentId: string) { if (!data.mailbox || !reader) return; try { const response = await fetch(`/api/mail/calendar-invite?mailboxId=${encodeURIComponent(data.mailbox.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachmentId, messageId: reader.id }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Unable to add this invitation to Calendar.'); setNotice(payload.existing ? 'This invitation is already on your Setu Calendar.' : 'Invitation added to Setu Calendar.'); } catch (error) { setNotice(errorText(error)); } }\n")
replace_once(path,
"{selectedAttachments.map(a=><button key={a.id} onClick={()=>void downloadAttachment(a.id)} className=\"flex w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-3 text-left text-sm font-bold\"><Paperclip size={16}/><span className=\"min-w-0 flex-1 truncate\">{a.filename}</span><span className=\"text-xs text-content-muted\">{fileSize(a.size_bytes)}</span><Download size={15}/></button>)}",
"{selectedAttachments.map(a=>{const calendar=isCalendarAttachment(a);return <button key={a.id} onClick={()=>void (calendar?importCalendarInvite(a.id):downloadAttachment(a.id))} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold ${calendar?'border-accent-500 bg-info-bg text-content-primary':'border-line bg-surface-2'}`}>{calendar?<CalendarPlus size={17} className=\"text-content-accent\"/>:<Paperclip size={16}/>}<span className=\"min-w-0 flex-1 truncate\">{calendar?'Add to Calendar':a.filename}</span><span className=\"text-xs text-content-muted\">{calendar?a.filename:fileSize(a.size_bytes)}</span>{calendar?null:<Download size={15}/>}</button>})}")

# 5) Accept text/calendar inbound attachments even if the storage bucket MIME allow-list does not.
path = 'src/app/api/mail/webhooks/resend/route.ts'
replace_once(path,
"      const contentType = String(item.content_type ?? 'application/octet-stream');\n      const path = `${mailbox.organization_id}/${mailbox.id}/${message.id}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;\n      const { error: uploadError } = await admin.storage.from(ATTACHMENT_BUCKET).upload(path, bytes, { contentType, upsert: false });",
"      const contentType = String(item.content_type ?? 'application/octet-stream');\n      const isCalendarAttachment = contentType.toLowerCase().startsWith('text/calendar') || filename.toLowerCase().endsWith('.ics');\n      // Supabase bucket MIME policy may reject text/calendar. Store bytes with a safe transport MIME while preserving the real MIME in mail_attachments.\n      const storageContentType = isCalendarAttachment ? 'application/octet-stream' : contentType;\n      const path = `${mailbox.organization_id}/${mailbox.id}/${message.id}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;\n      const { error: uploadError } = await admin.storage.from(ATTACHMENT_BUCKET).upload(path, bytes, { contentType: storageContentType, upsert: false });")

# 6) Push delivery observability: distinguish 'planned' from actual device send result.
path = 'src/lib/notifications/communication-notification-service.ts'
replace_once(path,
"      await sendWebPushToUsers(db, pushUserIds, {\n        title: input.title,\n        body: input.body,\n        action_url: input.actionUrl,\n        priority: input.priority ?? 'normal',\n        type: input.type,\n        icon: SETU_MAIL_PUSH_ICON,\n        badge: SETU_MAIL_PUSH_ICON,\n      }, input.organizationId);",
"      const pushResult = await sendWebPushToUsers(db, pushUserIds, {\n        title: input.title,\n        body: input.body,\n        action_url: input.actionUrl,\n        priority: input.priority ?? 'normal',\n        type: input.type,\n        icon: SETU_MAIL_PUSH_ICON,\n        badge: SETU_MAIL_PUSH_ICON,\n      }, input.organizationId);\n      if (pushResult.sent === 0) console.warn('[setu-communications:push] no device delivery', { organizationId: input.organizationId, type: input.type, userCount: pushUserIds.length, skipped: pushResult.skipped ?? null, pruned: pushResult.pruned });")

# 7) Push worker: request replacement of stale same-message notifications and focus existing app window by product route.
path = 'public/setu-mail-sw.js'
replace_once(path,
"      tag: payload.id || `${payload.type}:${url}`,\n      data: { url, type: payload.type },",
"      tag: payload.id || `${payload.type}:${url}`,\n      renotify: true,\n      data: { url, type: payload.type },")

# Regression source-contract checks.
Path('tests/mail/mobile-reliability-followup.test.mjs').write_text(r'''import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobile = readFileSync('src/features/mail/components/mobile-setu-mail-workspace.tsx', 'utf8');
const webhook = readFileSync('src/app/api/mail/webhooks/resend/route.ts', 'utf8');
const invite = readFileSync('src/app/api/mail/calendar-invite/route.ts', 'utf8');
const delivery = readFileSync('src/lib/notifications/communication-notification-service.ts', 'utf8');
const worker = readFileSync('public/setu-mail-sw.js', 'utf8');

test('mobile Inbox refreshes immediately on communication push and foreground resume', () => {
  assert.match(mobile, /SETU_MAIL_NOTIFICATION/);
  assert.match(mobile, /visibilitychange/);
  assert.match(mobile, /pageshow/);
  assert.match(mobile, /setInterval\(onVisible, 15000\)/);
  assert.match(mobile, /setReloadNonce\(value => value \+ 1\)/);
});

test('unread rows have unmistakable accent, weight and dot while read rows are de-emphasized', () => {
  assert.match(mobile, /border-l-4 border-l-accent-500 bg-info-bg/);
  assert.match(mobile, /aria-label=\"Unread\"/);
  assert.match(mobile, /message\.is_read\?'font-medium text-content-secondary':'font-black text-content-primary'/);
});

test('mobile Reader always exposes a visible 44px Back to Inbox action', () => {
  assert.match(mobile, /aria-label=\"Back to Inbox\"/);
  assert.match(mobile, /h-11 w-11/);
  assert.match(mobile, /setSelectedAttachments\(\[\]\)/);
});

test('inbound ICS survives storage MIME policy and is importable into Setu Calendar', () => {
  assert.match(webhook, /storageContentType = isCalendarAttachment \? 'application\/octet-stream' : contentType/);
  assert.match(mobile, /Add to Calendar/);
  assert.match(mobile, /\/api\/mail\/calendar-invite/);
  assert.match(invite, /source_ics_uid/);
  assert.match(invite, /security_status !== 'clean'/);
  assert.match(invite, /method !== 'REQUEST' && method !== 'PUBLISH'/);
});

test('push path records zero-delivery diagnostics and worker asks for visible renotification', () => {
  assert.match(delivery, /no device delivery/);
  assert.match(delivery, /pushResult\.sent === 0/);
  assert.match(worker, /renotify: true/);
});
''')

print('Materialized mobile Mail reliability fixes.')
