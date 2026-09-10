'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, ChevronLeft, FileText, Inbox, Mail, MoreHorizontal, Paperclip, PenLine, RefreshCw, Reply, Search, Send, Star, Trash2, UserPlus, X } from 'lucide-react';

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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function SetuMailWorkspace({ userName, userEmail, organizationName }: { userName: string; userEmail: string; organizationName: string }) {
  const [data, setData] = useState<MailPayload>({ mailbox: null, messages: [], providerReady: false, inboundReady: false });
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch('/api/mail', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load mail.');
      setData(payload);
      setSelectedId((current) => current ?? payload.messages?.[0]?.id ?? null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load mail.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const visibleMessages = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.messages.filter((message) => {
      if (folder === 'inbox' && message.direction !== 'inbound') return false;
      if (folder === 'sent' && message.direction !== 'outbound') return false;
      if (folder === 'drafts') return false;
      if (!term) return true;
      return [message.subject, message.from_address, ...(message.to_addresses ?? []), message.text_body ?? ''].join(' ').toLowerCase().includes(term);
    });
  }, [data.messages, folder, search]);

  const selected = data.messages.find((message) => message.id === selectedId) ?? visibleMessages[0] ?? null;
  const inboxCount = data.messages.filter((m) => m.direction === 'inbound' && !m.is_read).length;

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
      setNotice('Email sent.');
      setFolder('sent');
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Email could not be sent.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-slate-950">Mail</h1><span className="text-sm font-medium text-slate-400">Business email built into your Trade OS</span></div>
          <p className="mt-1 text-xs text-slate-500">{organizationName} · {data.mailbox?.address || userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 lg:block">{data.providerReady ? 'Sending ready' : 'Resend setup needed'} · {data.inboundReady ? 'Inbound ready' : 'Inbound not configured'}</div>
          <button onClick={() => setComposeOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-700"><PenLine size={16}/>Compose</button>
        </div>
      </div>

      {notice ? <div className="border-b border-blue-100 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[210px_380px_minmax(0,1fr)] xl:grid-cols-[210px_390px_minmax(0,1fr)_270px]">
        <aside className="hidden border-r border-slate-200 p-3 lg:block">
          <button onClick={() => setComposeOpen(true)} className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white"><PenLine size={16}/>Compose</button>
          {[{key:'inbox',label:'Inbox',icon:Inbox,count:inboxCount},{key:'sent',label:'Sent',icon:Send,count:0},{key:'drafts',label:'Drafts',icon:FileText,count:0}].map((item) => {
            const Icon = item.icon; const active = folder === item.key;
            return <button key={item.key} onClick={() => setFolder(item.key as typeof folder)} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><span className="flex items-center gap-3"><Icon size={17}/>{item.label}</span>{item.count ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] text-white">{item.count}</span> : null}</button>;
          })}
          <div className="my-4 border-t border-slate-100" />
          {[['Starred',Star],['Archive',Archive],['Trash',Trash2]].map(([label, Icon]) => <button key={String(label)} className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50"><Icon size={17}/>{label}</button>)}
          <div className="mt-6 rounded-2xl bg-slate-50 p-3"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Mailbox</div><div className="mt-2 truncate text-sm font-bold text-slate-800">{data.mailbox?.address || userEmail}</div><div className="mt-1 text-xs text-slate-500">{data.inboundReady ? 'Send & receive enabled' : 'Outbound foundation ready'}</div></div>
        </aside>

        <section className="border-r border-slate-200">
          <div className="flex gap-2 border-b border-slate-200 p-3"><label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search size={16} className="text-slate-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search emails..." className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label><button onClick={() => void refresh()} className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500"><RefreshCw size={16} className="mx-auto"/></button></div>
          <div className="max-h-[620px] overflow-y-auto">
            {loading ? <div className="p-8 text-center text-sm text-slate-400">Loading mail…</div> : visibleMessages.length === 0 ? <div className="p-8 text-center"><Mail className="mx-auto mb-3 text-slate-300"/><div className="font-black text-slate-700">No {folder} messages yet</div><p className="mt-1 text-sm text-slate-400">Your Setu Mail conversations will appear here.</p></div> : visibleMessages.map((message) => {
              const peer = message.direction === 'inbound' ? message.from_address : message.to_addresses?.[0] || 'Recipient';
              const active = selected?.id === message.id;
              return <button key={message.id} onClick={()=>setSelectedId(message.id)} className={`block w-full border-b border-slate-100 p-4 text-left ${active ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-2"><div className="truncate text-sm font-black text-slate-900">{peer}</div><div className="shrink-0 text-[11px] font-semibold text-slate-400">{formatTime(message.created_at)}</div></div><div className="mt-1 truncate text-sm font-bold text-slate-700">{message.subject || '(no subject)'}</div><div className="mt-1 truncate text-xs text-slate-400">{message.text_body || ''}</div></button>;
            })}
          </div>
        </section>

        <main className="min-w-0 bg-white">
          {selected ? <>
            <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 text-slate-500"><button className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft size={18}/></button><button className="rounded-lg p-2 hover:bg-slate-100"><Archive size={18}/></button><button className="rounded-lg p-2 hover:bg-slate-100"><Trash2 size={18}/></button><div className="flex-1"/><button className="rounded-lg p-2 hover:bg-slate-100"><Star size={18}/></button><button className="rounded-lg p-2 hover:bg-slate-100"><MoreHorizontal size={18}/></button></div>
            <div className="p-6 xl:p-8"><h2 className="text-xl font-black text-slate-950">{selected.subject || '(no subject)'}</h2><div className="mt-6 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-black text-slate-600">{(selected.direction === 'inbound' ? selected.from_address : userName).slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="text-sm font-black text-slate-900">{selected.direction === 'inbound' ? selected.from_address : userName}</div><div className="text-xs text-slate-400">{selected.direction === 'inbound' ? `to ${data.mailbox?.address || userEmail}` : `to ${selected.to_addresses?.join(', ')}`}</div></div><div className="text-xs text-slate-400">{formatTime(selected.created_at)}</div></div><div className="mt-8 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{selected.text_body || ''}</div><div className="mt-10 flex gap-2"><button onClick={()=>{setTo(selected.direction==='inbound'?selected.from_address:selected.to_addresses?.[0]||'');setSubject(selected.subject.startsWith('Re:')?selected.subject:`Re: ${selected.subject}`);setBody('');setComposeOpen(true);}} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Reply size={16}/>Reply</button></div></div>
          </> : <div className="flex h-full min-h-[520px] items-center justify-center p-8 text-center"><div><Mail size={32} className="mx-auto text-slate-300"/><h3 className="mt-3 font-black text-slate-700">Your mailbox is ready</h3><p className="mt-1 max-w-sm text-sm text-slate-400">Send a regular email to anyone. They do not need to be a lead, buyer, customer, or supplier.</p><button onClick={()=>setComposeOpen(true)} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">Compose email</button></div></div>}
        </main>

        <aside className="hidden border-l border-slate-200 bg-slate-50/50 p-4 xl:block">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Setu intelligence</div><h3 className="mt-2 font-black text-slate-900">CRM linking is optional</h3><p className="mt-2 text-sm leading-5 text-slate-500">Normal email works on its own. If Setu finds a matching lead, buyer, supplier, quote, or order, it can connect the conversation automatically.</p><button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700"><UserPlus size={16}/>Create CRM contact</button></div>
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="font-black text-violet-900">✦ Setu Guru</div><p className="mt-2 text-sm leading-5 text-violet-800">When business intent is detected, Guru can suggest a follow-up, lead, quote, or order action without changing the email itself.</p></div>
        </aside>
      </div>

      {composeOpen ? <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/20 p-4 md:p-6"><div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white"><div className="font-black">New message</div><button onClick={()=>setComposeOpen(false)}><X size={18}/></button></div><div className="divide-y divide-slate-100"><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">From</span><span className="font-semibold text-slate-700">{data.mailbox?.address || userEmail}</span></div><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">To</span><input autoFocus value={to} onChange={(e)=>setTo(e.target.value)} placeholder="Anyone@example.com" className="flex-1 outline-none"/></div><div className="flex items-center gap-3 px-4 py-3 text-sm"><span className="w-12 text-slate-400">Subject</span><input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Subject" className="flex-1 outline-none"/></div></div><textarea value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Write your message…" className="h-64 w-full resize-none p-4 text-sm leading-6 outline-none"/><div className="flex items-center border-t border-slate-100 p-3"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Paperclip size={18}/></button><div className="flex-1"/><button onClick={()=>void sendMessage()} disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"><Send size={16}/>{sending ? 'Sending…' : 'Send'}</button></div></div></div> : null}
    </div>
  );
}
