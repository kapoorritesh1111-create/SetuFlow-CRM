'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Download, FileText, Inbox, Mail, Paperclip, PenLine, RefreshCw, Reply, Search, Send, Settings, Sparkles, Star, Trash2, X } from 'lucide-react';
import { createDraftSession, mergeSavedDraft, persistSignature, restoreDraft, type MailMessage, type MailSignature } from '../lib/compose-state';

type Mailbox = { id: string; address: string; display_name: string | null };
type Attachment = { id: string; message_id: string | null; filename: string; content_type: string | null; size_bytes: number | null; created_at: string };
type MailPayload = { mailbox: Mailbox | null; messages: MailMessage[]; attachments: Attachment[]; signature: MailSignature | null; providerReady: boolean; inboundReady: boolean };
type Folder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'archive' | 'trash';
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type MailIntelligence = { messageId: string; peerAddress: string; crmMatch: null | { type: 'lead'; id: string; lead_type: string | null; company_name: string | null; contact_name: string | null; email: string | null; stage_id: string | null; owner_user_id: string | null; href: string }; createCrmHref?: string | null; intents: Array<{ key: string; label: string; confidence: 'high' | 'medium'; suggestedAction: string; evidence?: string; actionLabel?: string | null; actionHref?: string | null }>; autonomousActions: false };
function formatTime(v: string) { const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); }
function addresses(v: string) { return v.split(',').map(x => x.trim()).filter(Boolean); }
function fileSize(v: number | null) { const n = Number(v ?? 0); return n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`; }
function deliveryStatus(s: string) { const k = String(s || '').toLowerCase(); if (k === 'delivered') return { label: 'Delivered', classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' }; if (k === 'sent') return { label: 'Sent', classes: 'bg-blue-50 text-blue-700 border-blue-100' }; if (k === 'delayed') return { label: 'Delayed', classes: 'bg-amber-50 text-amber-700 border-amber-100' }; if (['bounced', 'complained', 'failed'].includes(k)) return { label: k === 'complained' ? 'Complaint' : k[0].toUpperCase() + k.slice(1), classes: 'bg-rose-50 text-rose-700 border-rose-100' }; if (k === 'received') return { label: 'Received', classes: 'bg-slate-50 text-slate-600 border-slate-200' }; return { label: s || 'Pending', classes: 'bg-slate-50 text-slate-600 border-slate-200' }; }

export function SetuMailWorkspace({ userName, userEmail, organizationName }: { userName: string; userEmail: string; organizationName: string }) {
  const [data, setData] = useState<MailPayload>({ mailbox: null, messages: [], attachments: [], signature: null, providerReady: false, inboundReady: false });
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [to, setTo] = useState(''); const [cc, setCc] = useState(''); const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(''); const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [parentMessageId, setParentMessageId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false); const [signatureText, setSignatureText] = useState('');
  const [savingSignature, setSavingSignature] = useState(false); const [signatureError, setSignatureError] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<MailIntelligence | null>(null); const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [composeBusy, setComposeBusy] = useState<'saving' | 'sending' | 'uploading' | null>(null);
  const busy = useRef(false);
  const signatureBusy = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSession = useRef<ReturnType<typeof createDraftSession> | null>(null);
  const lastSavedInput = useRef(''); const currentInput = useRef('');
  const refreshVersion = useRef(0);
  const mounted = useRef(true);
  const sending = composeBusy === 'sending';

  function stopAutosave() { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); autosaveTimer.current = null; }
  async function refresh() {
    const version = ++refreshVersion.current;
    setLoading(true);
    try {
      const r = await fetch('/api/mail', { cache: 'no-store' });
      const p = await r.json() as MailPayload & { error?: string };
      if (!r.ok) throw new Error(p.error || 'Unable to load mail.');
      // Do not overwrite a draft saved while this older mailbox request was in flight.
      if (mounted.current && refreshVersion.current === version) setData(p);
    } catch (e) { if (mounted.current) setNotice(e instanceof Error ? e.message : 'Unable to load mail.'); }
    finally { if (mounted.current) setLoading(false); }
  }
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; stopAutosave(); }; }, []);

  async function saveDraft(silent = false, force = false): Promise<string | null> {
    if (!composeOpen) return draftSession.current?.getId() ?? null;
    const input = { to: addresses(to), cc: addresses(cc), bcc: addresses(bcc), subject, text: body, threadId };
    const hasContent = to.trim() || cc.trim() || bcc.trim() || subject.trim() || body.trim();
    if (!force && !hasContent && !draftSession.current?.getId() && !draftSession.current?.hasPending()) return null;
    const session = draftSession.current ?? createDraftSession(draftId);
    draftSession.current = session;
    const key = JSON.stringify(input);
    setSaveState('saving');
    try {
      const draft = await session.save(input);
      if (mounted.current) {
        ++refreshVersion.current;
        setData(previous => ({ ...previous, messages: mergeSavedDraft(previous.messages, draft) }));
        if (draftSession.current === session) {
          setDraftId(draft.id);
          lastSavedInput.current = key;
          setSaveState(currentInput.current === key ? 'saved' : 'dirty');
          if (!silent) setNotice('Draft saved.');
        }
      }
      return draft.id;
    } catch (e) {
      if (mounted.current && draftSession.current === session) setSaveState('error');
      throw e;
    }
  }
  useEffect(() => {
    const key = JSON.stringify({ to: addresses(to), cc: addresses(cc), bcc: addresses(bcc), subject, text: body, threadId });
    currentInput.current = key;
    stopAutosave();
    if (!composeOpen || composeBusy) return;
    if (key === lastSavedInput.current) { setSaveState('saved'); return; }
    if (!to.trim() && !cc.trim() && !bcc.trim() && !subject.trim() && !body.trim() && !draftSession.current?.getId() && !draftSession.current?.hasPending()) { setSaveState('idle'); return; }
    setSaveState('dirty');
    autosaveTimer.current = setTimeout(() => { void saveDraft(true).catch(() => undefined); }, 1000);
    return stopAutosave;
  }, [composeOpen, composeBusy, to, cc, bcc, subject, body, threadId]);

  const filtered = useMemo(() => data.messages.filter(m => { const f = folder === 'starred' ? m.is_starred && m.folder !== 'trash' : m.folder === folder; const q = search.trim().toLowerCase(); return f && (!q || `${m.from_address} ${m.to_addresses.join(' ')} ${m.subject} ${m.text_body ?? ''}`.toLowerCase().includes(q)); }), [data.messages, folder, search]);
  const selected = filtered.find(m => m.id === selectedId) ?? filtered[0] ?? null;
  const selectedAttachments = data.attachments.filter(a => a.message_id === selected?.id);
  const draftCount = data.messages.filter(m => m.status === 'draft' && m.folder === 'drafts').length;
  const unreadCount = data.messages.filter(m => m.folder === 'inbox' && !m.is_read).length;
  useEffect(() => {
    if (!selected || selected.status === 'draft') { setIntelligence(null); setIntelligenceLoading(false); return; }
    let active = true; setIntelligenceLoading(true);
    fetch(`/api/mail/intelligence/${selected.id}`, { cache: 'no-store' }).then(async r => { const p = await r.json(); if (!r.ok) throw new Error(p.error || 'Unable to analyze this email.'); if (active) setIntelligence(p); }).catch(() => { if (active) setIntelligence(null); }).finally(() => { if (active) setIntelligenceLoading(false); });
    return () => { active = false; };
  }, [selected?.id, selected?.status]);

  function resetCompose() {
    stopAutosave(); draftSession.current = null; lastSavedInput.current = ''; currentInput.current = '';
    setComposeOpen(false); setTo(''); setCc(''); setBcc(''); setSubject(''); setBody('');
    setDraftId(null); setParentMessageId(null); setThreadId(null); setPendingAttachments([]); setSaveState('idle');
  }
  function openCompose() { if (composeOpen || busy.current) return; resetCompose(); draftSession.current = createDraftSession(); setComposeOpen(true); }
  async function closeCompose(): Promise<boolean> {
    if (busy.current) return false;
    busy.current = true; setComposeBusy('saving'); stopAutosave();
    try { await saveDraft(true); resetCompose(); return true; }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Unable to save draft. Your message is still open.'); return false; }
    finally { busy.current = false; setComposeBusy(null); }
  }
  async function openDraft(message: MailMessage) {
    if (busy.current || (composeOpen && draftId === message.id)) return;
    if (composeOpen && !await closeCompose()) return;
    resetCompose();
    const restored = restoreDraft(message, data.attachments);
    draftSession.current = createDraftSession(message.id);
    lastSavedInput.current = JSON.stringify({ to: addresses(restored.to), cc: addresses(restored.cc), bcc: addresses(restored.bcc), subject: restored.subject, text: restored.body, threadId: restored.threadId });
    setDraftId(message.id); setTo(restored.to); setCc(restored.cc); setBcc(restored.bcc); setSubject(restored.subject); setBody(restored.body);
    setThreadId(restored.threadId); setParentMessageId(null); setPendingAttachments(restored.attachments); setSaveState('saved'); setComposeOpen(true);
  }
  async function selectMessage(message: MailMessage) {
    if (message.status === 'draft' && message.folder === 'drafts') { await openDraft(message); return; }
    setSelectedId(message.id);
    if (!message.is_read) {
      try { const r = await fetch(`/api/mail/messages/${message.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', value: true }) }); if (!r.ok) throw new Error('Unable to mark message as read.'); ++refreshVersion.current; setData(previous => ({ ...previous, messages: previous.messages.map(m => m.id === message.id ? { ...m, is_read: true } : m) })); }
      catch (e) { setNotice(e instanceof Error ? e.message : 'Unable to update message.'); }
    }
  }
  async function reply() {
    if (!selected || busy.current) return;
    if (selected.status === 'draft') { await openDraft(selected); return; }
    const message = selected;
    if (composeOpen && !await closeCompose()) return;
    resetCompose(); draftSession.current = createDraftSession(); setComposeOpen(true);
    setTo(message.direction === 'inbound' ? message.from_address : message.to_addresses.join(', '));
    setSubject(/^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`);
    setThreadId(message.thread_id); setParentMessageId(message.id);
  }
  async function send() {
    if (busy.current) return;
    if (!data.mailbox) { setNotice('Your mailbox is not ready yet.'); return; }
    busy.current = true; setComposeBusy('sending'); stopAutosave();
    try {
      // Flush the latest edit and any earlier autosave before sending this exact draft.
      const savedId = await saveDraft(true);
      const r = await fetch('/api/mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mailboxId: data.mailbox.id, to: addresses(to), cc: addresses(cc), bcc: addresses(bcc), subject, text: body, draftId: savedId, threadId, parentMessageId, attachmentIds: pendingAttachments.map(a => a.id) }) });
      const p = await r.json(); if (!r.ok) throw new Error(p.error || 'Unable to send email.');
      setData(previous => ({ ...previous, messages: previous.messages.filter(m => m.id !== savedId) }));
      resetCompose(); setFolder('sent'); setSelectedId(null); setNotice('Email sent.'); await refresh();
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Unable to send email.'); }
    finally { busy.current = false; setComposeBusy(null); }
  }
  async function messageAction(action: 'read' | 'star' | 'archive' | 'trash') { if (!selected) return; const r = await fetch(`/api/mail/messages/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, value: action === 'star' ? !selected.is_starred : undefined }) }); if (r.ok) await refresh(); }
  async function upload(file: File) {
    if (busy.current) return;
    busy.current = true; setComposeBusy('uploading'); stopAutosave();
    try {
      // An attachment-only draft still needs a saved ID so reopening restores its files.
      const id = await saveDraft(true, true);
      if (!id) throw new Error('Save the draft before attaching a file.');
      const form = new FormData(); form.set('file', file); form.set('messageId', id); if (data.mailbox) form.set('mailboxId', data.mailbox.id);
      const r = await fetch('/api/mail/attachments', { method: 'POST', body: form }); const p = await r.json();
      if (!r.ok || !p.attachment) throw new Error(p.error || 'Unable to attach file.');
      const attachment = p.attachment as Attachment;
      ++refreshVersion.current;
      setPendingAttachments(items => [...items.filter(a => a.id !== attachment.id), attachment]);
      setData(previous => ({ ...previous, attachments: [...previous.attachments.filter(a => a.id !== attachment.id), attachment] }));
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Unable to attach file.'); }
    finally { busy.current = false; setComposeBusy(null); }
  }
  async function saveSignature() {
    if (signatureBusy.current) return;
    signatureBusy.current = true;
    setSavingSignature(true); setSignatureError(null);
    try {
      const signature = await persistSignature(signatureText);
      ++refreshVersion.current;
      setData(previous => ({ ...previous, signature })); setSignatureText(signature.text_signature ?? '');
      setSignatureOpen(false); setNotice('Signature saved.');
    } catch (e) { setSignatureError(e instanceof Error ? e.message : 'Unable to save signature. Please try again.'); }
    finally { signatureBusy.current = false; setSavingSignature(false); }
  }
  const folders: [Folder, string, typeof Inbox][] = [['inbox', 'Inbox', Inbox], ['sent', 'Sent', Send], ['drafts', 'Drafts', FileText], ['starred', 'Starred', Star], ['archive', 'Archive', Archive], ['trash', 'Trash', Trash2]];
  const saveLabel = saveState === 'saving' ? 'Saving draft...' : saveState === 'saved' ? 'Draft saved' : saveState === 'error' ? 'Draft not saved' : saveState === 'dirty' ? 'Unsaved changes' : 'New message';

  return <div className="h-[calc(100vh-7.5rem)] min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex h-full">
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-50/70 p-4"><button onClick={openCompose} disabled={loading || !data.mailbox} className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"><PenLine className="h-4 w-4"/>Compose</button><div className="space-y-1">{folders.map(([key, label, Icon]) => <button key={key} onClick={() => { setFolder(key); setSelectedId(null); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${folder === key ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-white'}`}><Icon className="h-4 w-4"/>{label}{(key === 'drafts' || key === 'inbox') && <span className="ml-auto text-xs tabular-nums" aria-label={key === 'drafts' ? `${draftCount} drafts` : `${unreadCount} unread messages`}>{key === 'drafts' ? draftCount : unreadCount}</span>}</button>)}</div><div className="mt-6 border-t border-slate-200 pt-4"><p className="truncate text-xs font-semibold text-slate-700">{data.mailbox?.address ?? userEmail}</p><p className="mt-1 text-[11px] text-slate-400">{organizationName}</p><button onClick={() => { setSignatureText(data.signature?.text_signature ?? ''); setSignatureError(null); setSignatureOpen(true); }} className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600"><Settings className="h-3.5 w-3.5"/>Signature</button></div></aside>
    <section className="w-[350px] shrink-0 border-r border-slate-200"><div className="border-b border-slate-200 p-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold capitalize text-slate-900">{folder}</h2><p className="text-xs text-slate-400">{filtered.length} messages</p></div><button onClick={() => void refresh()} title="Refresh mail" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button></div><div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search className="h-4 w-4 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search mail" className="w-full py-2 text-sm outline-none"/></div></div><div className="h-[calc(100%-91px)] overflow-y-auto">{filtered.map(m => <button key={m.id} onClick={() => void selectMessage(m)} className={`w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${selected?.id === m.id ? 'bg-blue-50/60' : ''}`}><div className="flex items-center justify-between gap-3"><p className={`truncate text-sm ${m.is_read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{m.direction === 'inbound' ? m.from_address : m.to_addresses.join(', ') || 'No recipient'}</p><span className="shrink-0 text-[11px] text-slate-400">{formatTime(m.draft_saved_at || m.created_at)}</span></div><p className={`mt-1 truncate text-sm ${m.is_read ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>{m.status === 'draft' && <span className="mr-2 text-xs font-semibold text-slate-500">Draft</span>}{m.subject || '(No subject)'}</p><p className="mt-1 truncate text-xs text-slate-400">{m.text_body || 'No preview'}</p></button>)}</div></section>
    <main className="min-w-0 flex-1 overflow-y-auto">{selected ? <><div className="border-b border-slate-200 px-6 py-4"><div className="flex items-start justify-between gap-4"><div><h1 className="text-lg font-semibold text-slate-900">{selected.subject || '(No subject)'}</h1><div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><span>{selected.direction === 'inbound' ? selected.from_address : selected.to_addresses.join(', ')}</span><span>&bull;</span><span>{new Date(selected.created_at).toLocaleString()}</span><span className={`rounded-full border px-2 py-0.5 ${deliveryStatus(selected.status).classes}`}>{deliveryStatus(selected.status).label}</span></div></div><div className="flex gap-1"><button onClick={() => void reply()} title={selected.status === 'draft' ? 'Edit draft' : 'Reply'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{selected.status === 'draft' ? <PenLine className="h-4 w-4"/> : <Reply className="h-4 w-4"/>}</button><button onClick={() => void messageAction('star')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Star className={`h-4 w-4 ${selected.is_starred ? 'fill-amber-400 text-amber-400' : ''}`}/></button><button onClick={() => void messageAction('archive')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Archive className="h-4 w-4"/></button><button onClick={() => void messageAction('trash')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Trash2 className="h-4 w-4"/></button></div></div></div>
      <div className="p-6"><div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{selected.text_body || 'No message body.'}</div>{selectedAttachments.length > 0 && <div className="mt-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Attachments</p><div className="flex flex-wrap gap-2">{selectedAttachments.map(a => <a key={a.id} href={`/api/mail/attachments?id=${a.id}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:border-blue-200 hover:text-blue-600"><Paperclip className="h-3.5 w-3.5"/>{a.filename}<span className="text-slate-400">{fileSize(a.size_bytes)}</span><Download className="h-3 w-3"/></a>)}</div></div>}
        {selected.status !== 'draft' && <div className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600"/><h3 className="text-sm font-semibold text-slate-900">Setu Guru</h3></div>{intelligenceLoading ? <p className="mt-3 text-sm text-slate-500">Understanding this conversation...</p> : intelligence ? <div className="mt-4 space-y-4"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">CRM connection</p>{intelligence.crmMatch ? <><p className="mt-2 text-sm font-semibold text-slate-900">{intelligence.crmMatch.company_name || intelligence.crmMatch.contact_name || intelligence.peerAddress}</p><p className="mt-1 text-xs text-slate-500">Matched from {intelligence.peerAddress}</p><a href={intelligence.crmMatch.href} className="mt-3 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700">Open lead</a></> : <><p className="mt-2 text-sm text-slate-600">No CRM record matches {intelligence.peerAddress}.</p>{intelligence.createCrmHref && <a href={intelligence.createCrmHref} className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Create lead</a>}</>}</div>{intelligence.intents.length > 0 ? <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Suggested next steps</p><div className="space-y-2">{intelligence.intents.map(i => <div key={i.key} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{i.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{i.suggestedAction}</p>{i.evidence && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-500">&ldquo;{i.evidence}&rdquo;</p>}</div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700">{i.confidence}</span></div>{i.actionHref && i.actionLabel && <a href={i.actionHref} className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">{i.actionLabel}</a>}</div>)}</div></div> : <p className="text-sm text-slate-500">No follow-up action is needed right now.</p>}<p className="text-[11px] text-slate-400">Guru suggests actions. You stay in control of every CRM change.</p></div> : <p className="mt-3 text-sm text-slate-500">Guru analysis is unavailable for this message.</p>}</div>}
        <button onClick={() => void reply()} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{selected.status === 'draft' ? <PenLine className="h-4 w-4"/> : <Reply className="h-4 w-4"/>}{selected.status === 'draft' ? 'Edit draft' : 'Reply'}</button></div></> : <div className="flex h-full items-center justify-center text-center"><div><Mail className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 text-sm font-medium text-slate-600">Select a message</p><p className="mt-1 text-xs text-slate-400">Read, reply and act on business conversations.</p></div></div>}</main>
  </div>
    {notice && <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X className="h-4 w-4"/></button></div>}
    {signatureOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><div role="dialog" aria-modal="true" aria-labelledby="mail-signature-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h3 id="mail-signature-title" className="text-lg font-semibold text-slate-900">Email signature</h3><p className="mt-1 text-sm text-slate-500">Added automatically when you send a message.</p><textarea aria-label="Signature text" value={signatureText} onChange={e => setSignatureText(e.target.value)} disabled={savingSignature} rows={7} maxLength={10000} className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/>{signatureError && <p role="alert" className="mt-2 text-sm text-rose-700">{signatureError}</p>}<div className="mt-4 flex justify-end gap-2"><button disabled={savingSignature} onClick={() => setSignatureOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600">Cancel</button><button disabled={savingSignature} onClick={() => void saveSignature()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingSignature ? 'Saving...' : 'Save signature'}</button></div></div></div>}
    {composeOpen && <div role="dialog" aria-label={draftId ? 'Edit draft' : 'New message'} className="fixed bottom-5 right-5 z-40 w-[560px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><span>{draftId ? 'Draft' : 'New message'}</span><button disabled={Boolean(composeBusy)} onClick={() => void closeCompose()} title="Save and close" aria-label="Save draft and close"><X className="h-4 w-4"/></button></div><fieldset disabled={Boolean(composeBusy)} className="divide-y divide-slate-100"><input aria-label="To" value={to} onChange={e => setTo(e.target.value)} placeholder="To" className="w-full px-4 py-3 text-sm outline-none"/><div className="grid grid-cols-2"><input aria-label="Cc" value={cc} onChange={e => setCc(e.target.value)} placeholder="Cc" className="border-r border-slate-100 px-4 py-3 text-sm outline-none"/><input aria-label="Bcc" value={bcc} onChange={e => setBcc(e.target.value)} placeholder="Bcc" className="px-4 py-3 text-sm outline-none"/></div><input aria-label="Subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full px-4 py-3 text-sm outline-none"/><textarea aria-label="Message" value={body} onChange={e => setBody(e.target.value)} rows={12} placeholder={`Write your message, ${userName.split(' ')[0] || ''}...`} className="w-full resize-none px-4 py-3 text-sm outline-none"/></fieldset>{pendingAttachments.length > 0 && <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">{pendingAttachments.map(a => <span key={a.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{a.filename}</span>)}</div>}<div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><div className="flex items-center gap-2"><label title="Attach file" className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Paperclip className="h-4 w-4"/><input aria-label="Attach file" type="file" disabled={Boolean(composeBusy)} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.currentTarget.value = ''; }}/></label><span className="text-xs text-slate-400">{data.signature?.text_signature ? 'Signature on' : 'No signature'}</span></div><button disabled={Boolean(composeBusy) || !to.trim()} onClick={() => void send()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4"/>{sending ? 'Sending...' : 'Send'}</button></div><div className="flex items-center justify-between border-t border-slate-100 px-4 py-2"><span role="status" aria-live="polite" className={`text-xs ${saveState === 'error' ? 'text-rose-700' : 'text-slate-500'}`}>{composeBusy === 'uploading' ? 'Attaching file...' : saveLabel}</span>{saveState === 'error' && <button disabled={Boolean(composeBusy)} onClick={() => { void saveDraft().catch(e => setNotice(e instanceof Error ? e.message : 'Unable to save draft.')); }} className="text-xs font-semibold text-blue-600">Retry save</button>}</div></div>}
  </div>;
}
