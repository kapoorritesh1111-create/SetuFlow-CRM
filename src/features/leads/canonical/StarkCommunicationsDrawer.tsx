'use client';

import { useMemo, useState, useTransition } from 'react';
import { sendStarkLeadWhatsApp, logStarkExternalEmailSent } from '@/features/integrations/interakt/sales-message-actions';

type TimelineItem = {
  id: string;
  channel: 'whatsapp' | 'email' | 'note' | 'call' | 'system';
  direction: 'inbound' | 'outbound' | 'internal';
  body: string;
  subject?: string | null;
  occurredAt: string;
  actorName?: string | null;
  status?: string | null;
  attachmentName?: string | null;
};

type Props = {
  leadId: string;
  companyName: string;
  contactName: string;
  email?: string | null;
  whatsappNumber?: string | null;
  items: TimelineItem[];
  linkedInterakt: boolean;
  whatsappReplyWindowOpen: boolean;
};

function fmt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function StarkCommunicationsLauncher(props: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'email' | 'note'>('all');
  const [mode, setMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => props.items.filter((item) => filter === 'all' || item.channel === filter), [props.items, filter]);
  const unread = props.items.filter((item) => item.direction === 'inbound').slice(0, 2).length;

  function sendWhatsApp() {
    if (!message.trim()) return;
    const form = new FormData();
    form.set('leadId', props.leadId);
    form.set('message', message.trim());
    startTransition(async () => {
      const result = await sendStarkLeadWhatsApp(form);
      setFeedback(result.message);
      if (result.ok) setMessage('');
    });
  }

  function openEmail() {
    if (!props.email) return;
    const href = `mailto:${encodeURIComponent(props.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = href;
  }

  function logEmail() {
    if (!props.email || !message.trim()) return;
    const form = new FormData();
    form.set('leadId', props.leadId);
    form.set('toEmail', props.email);
    form.set('subject', subject);
    form.set('body', message.trim());
    startTransition(async () => {
      const result = await logStarkExternalEmailSent(form);
      setFeedback(result.message);
      if (result.ok) { setMessage(''); setSubject(''); }
    });
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
      <span className="text-base">💬</span> Communications {unread ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px]">{unread}</span> : null}
    </button>

    {open ? <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30" role="dialog" aria-modal="true">
      <button className="absolute inset-0" aria-label="Close communications" onClick={() => setOpen(false)} />
      <aside className="relative flex h-full w-full max-w-[520px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div><p className="text-base font-black text-slate-950">Communications</p><p className="mt-0.5 text-xs text-slate-500">{props.companyName} · {props.contactName}</p></div>
          <button onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button>
        </header>

        <div className="border-b border-slate-200 px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {(['all','whatsapp','email','note'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-bold capitalize ${filter===value?'bg-blue-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{value === 'all' ? 'All' : value}</button>)}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
          {!visible.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"><p className="font-bold text-slate-800">No conversation recorded yet</p><p className="mt-1 text-xs text-slate-500">Messages, email records, notes and call activity will appear here.</p></div> : null}
          {visible.map((item) => <div key={item.id} className={`flex ${item.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm ${item.direction === 'outbound' ? 'border-blue-100 bg-blue-50' : item.direction === 'internal' ? 'border-purple-100 bg-purple-50' : 'border-emerald-100 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500"><span>{item.channel === 'whatsapp' ? '🟢 WhatsApp' : item.channel === 'email' ? '✉️ Email' : item.channel === 'call' ? '📞 Call' : item.channel === 'note' ? '📝 Note' : '• Activity'}</span><span>{fmt(item.occurredAt)}</span></div>
              {item.subject ? <p className="mt-2 text-xs font-black text-slate-900">{item.subject}</p> : null}
              <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-800">{item.body || 'Activity recorded.'}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400"><span>{item.actorName || (item.direction === 'outbound' ? 'You' : props.contactName)}</span>{item.status ? <span>{item.status}</span> : null}</div>
            </div>
          </div>)}
        </div>

        <footer className="border-t border-slate-200 bg-white p-4">
          <div className="mb-3 flex gap-2">
            <button onClick={() => {setMode('whatsapp');setFeedback('');}} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode==='whatsapp'?'bg-emerald-600 text-white':'bg-slate-100 text-slate-600'}`}>WhatsApp</button>
            <button onClick={() => {setMode('email');setFeedback('');}} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode==='email'?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>Email</button>
          </div>
          {mode === 'email' ? <input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Email subject" className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" /> : null}
          <textarea value={message} onChange={(e)=>setMessage(e.target.value)} rows={4} placeholder={mode==='whatsapp'?'Type a WhatsApp message…':'Write your email…'} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400" />
          {mode === 'whatsapp' && !props.linkedInterakt ? <p className="mt-2 text-[11px] text-amber-700">This lead has no linked Interakt thread yet. Existing conversation history will appear automatically once linked.</p> : null}
          {mode === 'whatsapp' && props.linkedInterakt && !props.whatsappReplyWindowOpen ? <p className="mt-2 text-[11px] text-amber-700">The free-text WhatsApp reply window is closed. Use an approved WhatsApp template from the inbound workflow to restart the conversation.</p> : null}
          {feedback ? <p className="mt-2 text-xs font-semibold text-slate-600">{feedback}</p> : null}
          <div className="mt-3 flex items-center justify-end gap-2">
            {mode === 'email' ? <><button type="button" onClick={openEmail} disabled={!props.email} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">Open email app</button><button type="button" onClick={logEmail} disabled={pending || !props.email || !message.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Log sent email</button></> : <button type="button" onClick={sendWhatsApp} disabled={pending || !message.trim() || !props.linkedInterakt || !props.whatsappReplyWindowOpen} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{pending?'Sending…':'Send WhatsApp'}</button>}
          </div>
        </footer>
      </aside>
    </div> : null}
  </>;
}
