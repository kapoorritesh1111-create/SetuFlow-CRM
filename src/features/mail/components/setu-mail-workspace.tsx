'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Download, FileText, Inbox, Mail, Paperclip, PenLine, RefreshCw, Reply, Search, Send, Settings, Star, Trash2, X } from 'lucide-react';

type MailMessage = {
  id: string; thread_id: string | null; direction: 'inbound' | 'outbound'; status: string; folder: string;
  from_address: string; to_addresses: string[]; cc_addresses: string[]; bcc_addresses: string[]; subject: string;
  text_body: string | null; is_read: boolean; is_starred: boolean; created_at: string; sent_at?: string | null; received_at?: string | null;
};
type Mailbox = { id: string; address: string; display_name: string | null };
type Attachment = { id: string; message_id: string | null; filename: string; content_type: string | null; size_bytes: number | null; created_at: string };
type Signature = { id: string; name: string; text_signature: string | null; html_signature: string | null; is_default: boolean };
type MailPayload = { mailbox: Mailbox | null; messages: MailMessage[]; attachments: Attachment[]; signature: Signature | null; providerReady: boolean; inboundReady: boolean };
type Folder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'archive' | 'trash';

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function addresses(value: string) { return value.split(',').map((v) => v.trim()).filter(Boolean); }
function fileSize(value: number | null) { const n = Number(value ?? 0); return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`; }

export function SetuMailWorkspace({ userName, userEmail, organizationName }: { userName: string; userEmail: string; organizationName: string }) {
  const [data, setData] = useState<MailPayload>({ mailbox: null, messages: [], attachments: [], signature: null, providerReady: false, inboundReady: false });
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [to, setTo] = useState(''); const [cc, setCc] = useState(''); const [bcc, setBcc] = useState(''); const [subject, setSubject] = useState(''); const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null); const [parentMessageId, setParentMessageId] = useState<string | null>(null); const [threadId, setThreadId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [search, setSearch] = useState(''); const [sending, setSending] = useState(false); const [loading, setLoading] = useState(true); const [notice, setNotice] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false); const [signatureText, setSignatureText] = useState(''); const [savingSignature, setSavingSignature] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch('/api/mail', { cache: 'no-store' });
      const payload = await response.json() as MailPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to load mail.');
      setData(payload); setSignatureText(payload.signature?.text_signature ?? '');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load mail.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function saveDraft(silent = false) {
    if (!composeOpen || (!to.trim() && !cc.trim() && !bcc.trim() && !subject.trim() && !body.trim())) return draftId;
    try {
      const response = await fetch('/api/mail/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId, to: addresses(to), cc: addresses(cc), bcc: addresses(bcc), subject, text: body, threadId }) });
      const payload = await response.json() as { draft?: { id: string }; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to save draft.');
      const id = payload.draft?.id ?? draftId; setDraftId(id ?? null); if (!silent) setNotice('Draft saved.'); return id ?? null;
    } catch (error) { if (!silent) setNotice(error instanceof Error ? error.message : 'Unable to save draft.'); return draftId; }
  }
  useEffect(() => {
    if (!composeOpen) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { void saveDraft(true); }, 1000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [composeOpen, to, cc, bcc, subject, body]);

  function resetCompose() { setTo(''); setCc(''); setBcc(''); setSubject(''); setBody(''); setDraftId(null); setParentMessageId(null); setThreadId(null); setPendingAttachments([]); }
  function newCompose() { resetCompose(); setComposeOpen(true); }
  function openReply(message: MailMessage) {
    resetCompose(); setTo(message.direction === 'inbound' ? message.from_address : message.to_addresses?.[0] || ''); setSubject(/^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`); setParentMessageId(message.id); setThreadId(message.thread_id); setComposeOpen(true);
  }
  function openDraft(message: MailMessage) {
    setDraftId(message.id); setTo((message.to_addresses ?? []).join(', ')); setCc((message.cc_addresses ?? []).join(', ')); setBcc((message.bcc_addresses ?? []).join(', ')); setSubject(message.subject ?? ''); setBody(message.text_body ?? ''); setThreadId(message.thread_id); setParentMessageId(null); setPendingAttachments(data.attachments.filter((a) => a.message_id === message.id)); setComposeOpen(true);
  }

  async function discardDraft() {
    for (const attachment of pendingAttachments) if (!attachment.message_id || attachment.message_id === draftId) await fetch('/api/mail/attachments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: attachment.id }) }).catch(() => null);
    if (draftId) await fetch('/api/mail/drafts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId }) });
    setComposeOpen(false); resetCompose(); await refresh();
  }

  async function uploadAttachment(file: File) {
    const id = await saveDraft(true);
    const form = new FormData(); form.append('file', file); if (id) form.append('messageId', id);
    const response = await fetch('/api/mail/attachments', { method: 'POST', body: form }); const payload = await response.json() as { attachment?: Attachment; error?: string };
    if (!response.ok || !payload.attachment) { setNotice(payload.error || 'Unable to upload attachment.'); return; }
    setPendingAttachments((items) => [...items, payload.attachment!]); setNotice(`${file.name} attached.`);
  }
  async function removePendingAttachment(id: string) {
    const response = await fetch('/api/mail/attachments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (response.ok) setPendingAttachments((items) => items.filter((a) => a.id !== id));
  }
  async function downloadAttachment(id: string) {
    const response = await fetch(`/api/mail/attachments?id=${encodeURIComponent(id)}`); const payload = await response.json() as { url?: string; error?: string };
    if (!response.ok || !payload.url) { setNotice(payload.error || 'Unable to download attachment.'); return; } window.open(payload.url, '_blank', 'noopener,noreferrer');
  }

  async function sendMessage() {
    if (!to.trim() || !subject.trim() || !body.trim()) { setNotice('Add a recipient, subject, and message before sending.'); return; }
    setSending(true); setNotice(null);
    try {
      const response = await fetch('/api/mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: addresses(to), cc: addresses(cc), bcc: addresses(bcc), subject: subject.trim(), text: body.trim(), threadId, parentMessageId, draftId, attachmentIds: pendingAttachments.map((a) => a.id) }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Email could not be sent.');
      setComposeOpen(false); resetCompose(); setNotice('Email sent.'); setFolder('sent'); await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Email could not be sent.'); }
    finally { setSending(false); }
  }

  async function messageAction(message: MailMessage, action: 'read' | 'star' | 'archive' | 'trash', value: boolean) {
    const response = await fetch(`/api/mail/messages/${message.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [action]: value }) });
    if (!response.ok) { const p = await response.json().catch(() => ({})); setNotice(p.error || 'Unable to update message.'); return; }
    await refresh();
  }
  async function selectMessage(message: MailMessage) { if (message.status === 'draft') { openDraft(message); return; } setSelectedId(message.id); if (!message.is_read) await messageAction(message, 'read', true); }

  async function saveSignature() {
    setSavingSignature(true);
    try { const response = await fetch('/api/mail/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Default', text: signatureText }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to save signature.'); setSignatureOpen(false); setNotice('Signature saved.'); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save signature.'); } finally { setSavingSignature(false); }
  }

  const visibleMessages = useMemo(() => data.messages.filter((message) => {
    if (folder === 'inbox' && message.folder !== 'inbox') return false;
    if (folder === 'sent' && message.folder !== 'sent') return false;
    if (folder === 'drafts' && message.folder !== 'drafts') return false;
    if (folder === 'archive' && message.folder !== 'archive') return false;
    if (folder === 'trash' && message.folder !== 'trash') return false;
    if (folder === 'starred' && (!message.is_starred || message.folder === 'trash')) return false;
    const term = search.trim().toLowerCase(); if (!term) return true;
    return [message.subject, message.from_address, ...(message.to_addresses ?? []), message.text_body ?? ''].join(' ').toLowerCase().includes(term);
  }), [data.messages, folder, search]);
  const selected = data.messages.find((m) => m.id === selectedId && m.status !== 'draft') ?? visibleMessages.find((m) => m.status !== 'draft') ?? null;
  const messageAttachments = selected ? data.attachments.filter((a) => a.message_id === selected.id) : [];
  const unread = data.messages.filter((m) => m.folder === 'inbox' && !m.is_read).length;
  const mailboxAddress = data.mailbox?.address || userEmail;

  const folderDefs: Array<[Folder, string, React.ReactNode, number?]> = [
    ['inbox', 'Inbox', <Inbox size={17}/>, unread], ['sent', 'Sent', <Send size={17}/>], ['drafts', 'Drafts', <FileText size={17}/>], ['starred', 'Starred', <Star size={17}/>], ['archive', 'Archive', <Archive size={17}/>], ['trash', 'Trash', <Trash2 size={17}/>],
  ];

  return <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
      <div><div className="flex items-center gap-3"><h1 className="text-2xl font-black text-slate-950">Mail</h1><span className="text-sm text-slate-400">Business email built into your Trade OS</span></div><p className="mt-1 text-xs text-slate-500">{organizationName} · {mailboxAddress}</p></div>
      <div className="flex items-center gap-2"><span className="hidden rounded-full border px-3 py-1.5 text-xs font-bold text-slate-600 lg:block">{data.providerReady ? 'Sending ready' : 'Resend setup needed'} · {data.inboundReady ? 'Inbound ready' : 'Inbound awaiting webhook'}</span><button onClick={() => setSignatureOpen(true)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600" title="Mail settings"><Settings size={17}/></button><button onClick={newCompose} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white"><PenLine size={16}/>Compose</button></div>
    </div>
    {notice ? <div className="border-b border-blue-100 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-900">{notice}</div> : null}
    <div className="grid min-h-[680px] grid-cols-[210px_390px_minmax(0,1fr)] xl:grid-cols-[210px_390px_minmax(0,1fr)_260px]">
      <aside className="border-r border-slate-200 p-3"><button onClick={newCompose} className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white"><PenLine size={16}/>Compose</button>{folderDefs.map(([key,label,icon,count]) => <button key={key} onClick={() => { setFolder(key); setSelectedId(null); }} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold ${folder===key?'bg-blue-50 text-blue-700':'text-slate-600 hover:bg-slate-50'}`}><span className="flex items-center gap-3">{icon}{label}</span>{count ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] text-white">{count}</span>:null}</button>)}</aside>
      <section className="border-r border-slate-200"><div className="flex gap-2 border-b p-3"><label className="flex h-10 flex-1 items-center gap-2 rounded-xl border bg-slate-50 px-3"><Search size={16} className="text-slate-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search mail" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label><button onClick={()=>void refresh()} className="h-10 w-10 rounded-xl border text-slate-500"><RefreshCw size={16} className="mx-auto"/></button></div><div className="max-h-[620px] overflow-y-auto">{loading?<div className="p-8 text-center text-sm text-slate-400">Loading mail…</div>:visibleMessages.length===0?<div className="p-8 text-center text-sm text-slate-400">No {folder} messages.</div>:visibleMessages.map((m)=>{const peer=m.status==='draft'?'Draft':m.direction==='inbound'?m.from_address:m.to_addresses?.[0]||'Recipient';return <button key={m.id} onClick={()=>void selectMessage(m)} className={`block w-full border-b p-4 text-left ${selected?.id===m.id?'bg-blue-50/70':'hover:bg-slate-50'} ${!m.is_read?'bg-blue-50/30':''}`}><div className="flex gap-2"><div className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{peer}</div>{m.is_starred?<Star size={14} className="fill-current text-amber-500"/>:null}<span className="text-[11px] text-slate-400">{formatTime(m.created_at)}</span></div><div className="mt-1 truncate text-sm font-bold text-slate-700">{m.subject||'(no subject)'}</div><div className="mt-1 truncate text-xs text-slate-400">{m.text_body||''}</div></button>})}</div></section>
      <main className="min-w-0">{selected?<div className="p-6 xl:p-8"><div className="flex items-start gap-3"><h2 className="min-w-0 flex-1 text-xl font-black text-slate-950">{selected.subject||'(no subject)'}</h2><button onClick={()=>void messageAction(selected,'star',!selected.is_starred)} className="p-2 text-slate-500"><Star size={18} className={selected.is_starred?'fill-current text-amber-500':''}/></button><button onClick={()=>void messageAction(selected,'archive',selected.folder!=='archive')} className="p-2 text-slate-500"><Archive size={18}/></button><button onClick={()=>void messageAction(selected,'trash',selected.folder!=='trash')} className="p-2 text-slate-500"><Trash2 size={18}/></button></div><div className="mt-5 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-black">{(selected.direction==='inbound'?selected.from_address:userName).slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{selected.direction==='inbound'?selected.from_address:userName}</div><div className="truncate text-xs text-slate-400">to {selected.direction==='inbound'?mailboxAddress:selected.to_addresses.join(', ')}</div>{selected.cc_addresses?.length?<div className="truncate text-xs text-slate-400">cc {selected.cc_addresses.join(', ')}</div>:null}</div><div className="text-xs text-slate-400">{formatTime(selected.created_at)}</div></div><div className="mt-8 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{selected.text_body||''}</div>{messageAttachments.length?<div className="mt-7"><div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Attachments</div><div className="flex flex-wrap gap-2">{messageAttachments.map((a)=><button key={a.id} onClick={()=>void downloadAttachment(a.id)} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold text-slate-700"><Paperclip size={14}/>{a.filename}<span className="text-slate-400">{fileSize(a.size_bytes)}</span><Download size={13}/></button>)}</div></div>:null}<button onClick={()=>openReply(selected)} className="mt-8 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold"><Reply size={16}/>Reply</button></div>:<div className="flex min-h-[520px] items-center justify-center text-center text-slate-400"><div><Mail size={32} className="mx-auto"/><div className="mt-3 font-black text-slate-700">Select a message</div></div></div>}</main>
      <aside className="hidden border-l bg-slate-50/60 p-4 xl:block"><div className="rounded-2xl border bg-white p-4"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Setu intelligence</div><h3 className="mt-2 font-black">CRM linking is optional</h3><p className="mt-2 text-sm leading-5 text-slate-500">Normal email works independently. CRM matches and Guru actions can be layered onto the conversation.</p></div><a href="/admin/mail" className="mt-4 block rounded-xl border bg-white px-4 py-3 text-center text-sm font-black text-slate-700">Admin Setu Mail</a></aside>
    </div>

    {composeOpen?<div className="fixed inset-0 z-[500] flex items-end justify-end bg-slate-950/25 p-5"><div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center bg-slate-900 px-4 py-3 text-white"><div className="flex-1 font-black">{draftId?'Draft':'New message'}</div><button onClick={()=>void discardDraft()} title="Discard"><Trash2 size={17}/></button><button onClick={()=>{void saveDraft(true);setComposeOpen(false);}} className="ml-3" title="Save and close"><X size={18}/></button></div><div className="divide-y"><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">From</span><span className="font-semibold">{mailboxAddress}</span></div><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">To</span><input autoFocus value={to} onChange={(e)=>setTo(e.target.value)} className="flex-1 outline-none" placeholder="anyone@example.com"/></div><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">Cc</span><input value={cc} onChange={(e)=>setCc(e.target.value)} className="flex-1 outline-none" placeholder="cc@example.com"/></div><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">Bcc</span><input value={bcc} onChange={(e)=>setBcc(e.target.value)} className="flex-1 outline-none" placeholder="bcc@example.com"/></div><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">Subject</span><input value={subject} onChange={(e)=>setSubject(e.target.value)} className="flex-1 outline-none"/></div></div><textarea value={body} onChange={(e)=>setBody(e.target.value)} className="h-56 w-full resize-none p-4 text-sm leading-6 outline-none" placeholder="Write your message…"/>{pendingAttachments.length?<div className="flex flex-wrap gap-2 px-4 pb-3">{pendingAttachments.map((a)=><span key={a.id} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold">{a.filename}<button onClick={()=>void removePendingAttachment(a.id)}><X size={13}/></button></span>)}</div>:null}<div className="flex items-center border-t p-3"><label className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Paperclip size={18}/><input type="file" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)void uploadAttachment(f);e.currentTarget.value='';}}/></label><span className="ml-2 text-xs text-slate-400">Autosaved</span><div className="flex-1"/><button onClick={()=>void sendMessage()} disabled={sending} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{sending?'Sending…':'Send'}</button></div></div></div>:null}

    {signatureOpen?<div className="fixed inset-0 z-[510] flex items-center justify-center bg-slate-950/25 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center"><h3 className="flex-1 text-lg font-black">Email signature</h3><button onClick={()=>setSignatureOpen(false)}><X size={18}/></button></div><p className="mt-1 text-sm text-slate-500">This signature is automatically added to outgoing Setu Mail.</p><textarea value={signatureText} onChange={(e)=>setSignatureText(e.target.value)} className="mt-4 h-40 w-full rounded-xl border p-3 text-sm outline-none" placeholder={`${userName}\n${organizationName}`}/><div className="mt-4 flex justify-end gap-2"><button onClick={()=>setSignatureOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-bold">Cancel</button><button onClick={()=>void saveSignature()} disabled={savingSignature} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">{savingSignature?'Saving…':'Save signature'}</button></div></div></div>:null}
  </div>;
}
