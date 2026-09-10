'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Inbox, Mail, MoreHorizontal, Paperclip, PenLine, Reply, Search, Send, Star, X } from 'lucide-react';

type MailMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  text_body: string | null;
  is_read: boolean;
  created_at: string;
};

type Mailbox = { id: string; address: string; display_name: string | null };
type MailPayload = { mailbox: Mailbox | null; messages: MailMessage[]; providerReady: boolean; inboundReady: boolean };

type Folder = 'inbox' | 'sent' | 'drafts';

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MobileSetuMailWorkspace({ userName, userEmail, organizationName }: { userName: string; userEmail: string; organizationName: string }) {
  const [data, setData] = useState<MailPayload>({ mailbox: null, messages: [], providerReady: false, inboundReady: false });
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    try {
      const response = await fetch('/api/mail', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load mail.');
      setData(payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load mail.');
    }
  }

  useEffect(() => { void refresh(); }, []);

  const messages = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.messages.filter((message) => {
      if (folder === 'inbox' && message.direction !== 'inbound') return false;
      if (folder === 'sent' && message.direction !== 'outbound') return false;
      if (folder === 'drafts') return false;
      if (!term) return true;
      return [message.subject, message.from_address, ...(message.to_addresses ?? []), message.text_body ?? ''].join(' ').toLowerCase().includes(term);
    });
  }, [data.messages, folder, search]);

  const selected = data.messages.find((message) => message.id === selectedId) ?? null;
  const unread = data.messages.filter((message) => message.direction === 'inbound' && !message.is_read).length;

  function openReply(message: MailMessage) {
    setTo(message.direction === 'inbound' ? message.from_address : message.to_addresses?.[0] || '');
    setSubject(message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`);
    setBody('');
    setComposeOpen(true);
  }

  async function sendMessage() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setNotice('Add a recipient, subject, and message before sending.');
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), text: body.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Email could not be sent.');
      setComposeOpen(false);
      setTo(''); setSubject(''); setBody('');
      setFolder('sent');
      setSelectedId(null);
      setNotice('Email sent.');
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Email could not be sent.');
    } finally {
      setSending(false);
    }
  }

  if (selected) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-white pb-24 md:hidden">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3">
            <button onClick={() => setSelectedId(null)} className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Back to inbox"><ArrowLeft size={20}/></button>
            <div className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{selected.subject || '(no subject)'}</div>
            <button className="rounded-full p-2 text-slate-500"><Star size={19}/></button>
            <button className="rounded-full p-2 text-slate-500"><MoreHorizontal size={20}/></button>
          </div>
        </div>
        <div className="px-4 py-5">
          <h1 className="text-[22px] font-black leading-tight text-slate-950">{selected.subject || '(no subject)'}</h1>
          <div className="mt-5 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700">{(selected.direction === 'inbound' ? selected.from_address : userName).slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-slate-900">{selected.direction === 'inbound' ? selected.from_address : userName}</div>
              <div className="mt-0.5 truncate text-xs text-slate-400">{selected.direction === 'inbound' ? `to ${data.mailbox?.address || userEmail}` : `to ${selected.to_addresses?.join(', ')}`}</div>
            </div>
            <div className="text-[11px] font-semibold text-slate-400">{formatTime(selected.created_at)}</div>
          </div>
          <div className="mt-7 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{selected.text_body || ''}</div>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-800"><Paperclip size={16}/>Attachments</div>
            <div className="mt-2 text-xs text-slate-400">Attachments will appear here when inbound attachment storage is enabled.</div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2">
            <button onClick={() => openReply(selected)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"><Reply size={16}/>Reply</button>
            <button onClick={() => { setTo(selected.to_addresses?.[0] || ''); setSubject(`Fwd: ${selected.subject}`); setBody(`\n\n---------- Forwarded message ----------\n${selected.text_body || ''}`); setComposeOpen(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"><Send size={16}/>Forward</button>
          </div>
          <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <div className="font-black text-violet-900">✦ Setu Guru</div>
            <p className="mt-2 text-sm leading-5 text-violet-800">CRM linking stays optional. Guru can suggest a lead, quote, order, or follow-up when business intent is detected.</p>
          </div>
        </div>
        {composeOpen ? renderCompose() : null}
      </div>
    );
  }

  function renderCompose() {
    return (
      <div className="fixed inset-0 z-[500] bg-white md:hidden">
        <div className="flex h-14 items-center border-b border-slate-200 px-3">
          <button onClick={() => setComposeOpen(false)} className="rounded-full p-2 text-slate-700" aria-label="Close compose"><X size={20}/></button>
          <div className="ml-1 flex-1 text-base font-black text-slate-900">New Message</div>
          <button onClick={() => void sendMessage()} disabled={sending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{sending ? 'Sending…' : 'Send'}</button>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-14 text-slate-400">From</span><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{data.mailbox?.address || userEmail}</span></div>
          <div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-14 text-slate-400">To</span><input autoFocus value={to} onChange={(e) => setTo(e.target.value)} placeholder="Anyone@example.com" className="min-w-0 flex-1 outline-none"/></div>
          <div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-14 text-slate-400">Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="min-w-0 flex-1 outline-none"/></div>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className="h-[calc(100vh-220px)] w-full resize-none px-4 py-4 text-[15px] leading-6 outline-none"/>
        <div className="fixed inset-x-0 bottom-0 flex h-14 items-center gap-4 border-t border-slate-200 bg-white px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}><Paperclip size={19} className="text-slate-500"/><span className="text-xs font-semibold text-slate-400">Attachments coming in the inbound MVP step</span></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-white pb-24 md:hidden">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0 flex-1"><div className="text-[22px] font-black text-slate-950">Setu Mail</div><div className="truncate text-xs text-slate-400">{organizationName} · {data.mailbox?.address || userEmail}</div></div>
          <button onClick={() => setSearchOpen((value) => !value)} className="rounded-full p-2 text-slate-600"><Search size={20}/></button>
          <button className="rounded-full p-2 text-slate-600"><MoreHorizontal size={20}/></button>
        </div>
        <div className="px-4 pb-3"><button onClick={() => setComposeOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white"><PenLine size={16}/>Compose</button></div>
        {searchOpen ? <div className="px-4 pb-3"><label className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3"><Search size={16} className="text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mail" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label></div> : null}
        <div className="grid grid-cols-3 px-3">
          {([
            ['inbox', 'Inbox', unread],
            ['sent', 'Sent', 0],
            ['drafts', 'Drafts', 0],
          ] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => { setFolder(key); setSelectedId(null); }} className={`relative flex h-11 items-center justify-center gap-1.5 text-sm font-black ${folder === key ? 'text-blue-600' : 'text-slate-400'}`}>
              {key === 'inbox' ? <Inbox size={16}/> : key === 'sent' ? <Send size={16}/> : <FileText size={16}/>} {label}{count ? <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{count}</span> : null}
              <span className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full ${folder === key ? 'bg-blue-600' : 'bg-transparent'}`} />
            </button>
          ))}
        </div>
      </div>

      {notice ? <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-900">{notice}</div> : null}

      <div>
        {messages.length === 0 ? <div className="px-6 py-16 text-center"><Mail size={34} className="mx-auto text-slate-300"/><div className="mt-3 font-black text-slate-800">No {folder} messages yet</div><p className="mt-1 text-sm leading-5 text-slate-400">Send a regular email to anyone. They do not need to be in your CRM.</p></div> : messages.map((message) => {
          const peer = message.direction === 'inbound' ? message.from_address : message.to_addresses?.[0] || 'Recipient';
          return <button key={message.id} onClick={() => setSelectedId(message.id)} className="flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left active:bg-slate-50"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700">{peer.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><div className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{peer}</div><span className="shrink-0 text-[11px] font-semibold text-slate-400">{formatTime(message.created_at)}</span></div><div className="mt-0.5 truncate text-sm font-bold text-slate-700">{message.subject || '(no subject)'}</div><div className="mt-0.5 truncate text-xs text-slate-400">{message.text_body || ''}</div></div><Star size={16} className="mt-6 shrink-0 text-slate-300"/></button>;
        })}
      </div>

      {composeOpen ? renderCompose() : null}
    </div>
  );
}
