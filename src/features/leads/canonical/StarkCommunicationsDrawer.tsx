'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { FaIcon } from '@/components/ui/fa-icon';
import { logStarkExternalEmailSent, sendStarkLeadWhatsApp, sendStarkLeadWhatsAppTemplate } from '@/features/integrations/interakt/sales-message-actions';

type TimelineItem = { id: string; channel: 'whatsapp' | 'email' | 'note' | 'call' | 'system'; direction: 'inbound' | 'outbound' | 'internal'; body: string; subject?: string | null; occurredAt: string; actorName?: string | null; status?: string | null; attachmentName?: string | null; attachmentUrl?: string | null; messageType?: string | null };
type Props = { leadId: string; companyName: string; contactName: string; email?: string | null; whatsappNumber?: string | null; leadScore?: number; items: TimelineItem[]; linkedInterakt: boolean; whatsappReplyWindowOpen: boolean; whatsappTemplateConfigured?: boolean };
type Brochure = { id: string; name: string; recommended?: boolean };
type Attachment = { id: string; fileName: string; mimeType: string; fileSize: number; url: string };

const EMOJIS = ['😊','👍','🙏','✨','✅','📎','📦','🎨','💬','❤️','👏','🙂','🤝','🚀','📞','📩'];
const fmt = (value: string) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const day = (value: string) => new Date(value).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

function body(item: TimelineItem) {
  const raw = String(item.body || '').trim();
  if (raw.startsWith('{')) try { const payload = JSON.parse(raw); return String(payload?.title || payload?.button_reply?.title || payload?.list_reply?.title || payload?.interactive?.button_reply?.title || payload?.interactive?.list_reply?.title || raw); } catch {}
  return raw === 'None' && item.attachmentUrl ? '' : raw || 'Activity recorded.';
}

function suggestions(p: Props) {
  const text = p.items.slice(-8).map((item) => body(item)).join(' ').toLowerCase();
  const name = p.contactName || 'there';
  if (/artwork|design|printing|image|attachment/.test(text)) return [`Thanks ${name}, we have the artwork/reference. We will review it and confirm the right structure and pricing.`, `Thanks for sharing this. Please also confirm the final quantity so we can prepare accurate pricing.`, `We have received the design reference. I will have our team review it and come back with the next step.`];
  if (/1000|5000|pcs|piece|quantity/.test(text)) return [`Thanks ${name}. I have noted the quantity. Let me confirm MOQ and pricing for you.`, `Got it. I will work on the best pricing based on this quantity and update you.`, `Thanks. Do you already have the final artwork, or would you like our team to help with the design?`];
  return [`Thanks ${name}. I have your requirement and will help you with the next step.`, `I can help with MOQ, pricing and artwork. Which would you like to review first?`, `Thanks for the details. I will review this and come back with the best option for you.`];
}

export function StarkCommunicationsLauncher(p: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'email' | 'note'>('all');
  const [mode, setMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [feedback, setFeedback] = useState('');
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [brochureId, setBrochureId] = useState('');
  const [brochureTouched, setBrochureTouched] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const visible = useMemo(() => p.items.filter((item) => filter === 'all' || item.channel === filter), [p.items, filter]);
  const groups = useMemo(() => { const grouped: Array<{ label: string; items: TimelineItem[] }> = []; for (const item of visible) { const label = day(item.occurredAt); const current = grouped[grouped.length - 1]; current?.label === label ? current.items.push(item) : grouped.push({ label, items: [item] }); } return grouped; }, [visible]);
  const ideas = useMemo(() => suggestions(p), [p.items, p.contactName]);
  const recommendedBrochure = brochures.find((item) => item.recommended) ?? null;
  const selectedBrochure = brochures.find((item) => item.id === brochureId) ?? null;

  useEffect(() => {
    if (!open || !p.linkedInterakt) return;
    let active = true;
    void fetch(`/api/catalog-brochures?lead_id=${encodeURIComponent(p.leadId)}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() : { brochures: [] }).then((payload) => { if (active && Array.isArray(payload.brochures)) setBrochures(payload.brochures); }).catch(() => undefined);
    return () => { active = false; };
  }, [open, p.leadId, p.linkedInterakt]);

  useEffect(() => {
    if (!brochureTouched && !brochureId && recommendedBrochure?.id) setBrochureId(recommendedBrochure.id);
  }, [brochureId, brochureTouched, recommendedBrochure]);

  function insertEmoji(emoji: string) {
    const element = textareaRef.current; const start = element?.selectionStart ?? message.length; const end = element?.selectionEnd ?? message.length;
    const next = `${message.slice(0, start)}${emoji}${message.slice(end)}`; setMessage(next);
    requestAnimationFrame(() => { if (element) { element.focus(); element.setSelectionRange(start + emoji.length, start + emoji.length); } });
  }

  async function stageAttachment(file: File) {
    setUploading(true); setFeedback('');
    try {
      const form = new FormData(); form.set('file', file); form.set('leadId', p.leadId);
      const response = await fetch('/api/interakt/attachments', { method: 'POST', body: form }); const payload = await response.json();
      if (!response.ok || !payload?.attachment?.id) throw new Error(payload?.error || 'Attachment upload failed.');
      setAttachment(payload.attachment as Attachment);
    } catch (error) { setAttachment(null); setFeedback(error instanceof Error ? error.message : 'Attachment upload failed.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  function send() {
    if (!message.trim() && !attachment && !brochureId) return;
    const form = new FormData(); form.set('leadId', p.leadId); form.set('message', message.trim()); if (brochureId) form.set('brochureId', brochureId); if (attachment?.id) form.set('attachmentId', attachment.id);
    startTransition(async () => { const result = await sendStarkLeadWhatsApp(form); setFeedback(result.message); if (result.ok) { setMessage(''); setAttachment(null); } });
  }

  function restart() { if (!p.whatsappTemplateConfigured) return; const form = new FormData(); form.set('leadId', p.leadId); startTransition(async () => { const result = await sendStarkLeadWhatsAppTemplate(form); setFeedback(result.message); }); }
  function email() { if (p.email) location.href = `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`; }
  function log() { if (!p.email || !message.trim()) return; const form = new FormData(); form.set('leadId', p.leadId); form.set('toEmail', p.email); form.set('subject', subject); form.set('body', message); startTransition(async () => { const result = await logStarkExternalEmailSent(form); setFeedback(result.message); }); }

  const sendLabel = pending ? 'Sending…' : attachment && brochureId ? 'Send + brochure + attachment' : attachment ? 'Send + attachment' : brochureId ? 'Send + brochure' : 'Send WhatsApp';

  return <>
    <button onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-[#20344f] shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FaIcon icon="comments" fixedWidth /></span><span>Communications</span><span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">{p.items.length}</span></button>
    {open ? <div className="fixed inset-0 z-[250] flex justify-end bg-slate-950/35 backdrop-blur-[1px]"><button className="absolute inset-0" aria-label="Close communications" onClick={() => setOpen(false)} /><aside className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-base font-bold text-slate-950">Communications</h2><p className="mt-1 text-xs text-slate-500">{p.companyName} · complete customer conversation</p></div><button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-500">×</button></header>
      <div className="grid grid-cols-4 gap-2 border-b border-slate-100 px-4 py-3">{(['all','whatsapp','email','note'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-2 py-2 text-xs font-semibold capitalize ${filter === value ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{value}</button>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{groups.map((group) => <section key={group.label} className="mb-5"><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-2 py-1">{group.label}</span><span className="h-px flex-1 bg-slate-100" /></div><div className="space-y-3">{group.items.map((item) => <div key={item.id} className={`flex ${item.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-3 ${item.direction === 'outbound' ? 'bg-blue-50' : 'bg-emerald-50'}`}><div className="mb-1 text-[10px] font-semibold text-slate-500">{item.direction === 'outbound' ? 'You' : item.actorName || p.companyName} · {fmt(item.occurredAt)}</div>{body(item) ? <p className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">{body(item)}</p> : null}{item.attachmentUrl ? <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl border bg-white"><span className="block px-3 py-2 text-xs font-semibold text-blue-700">📎 {item.attachmentName || 'Open attachment'}</span>{/image/i.test(item.messageType || '') ? <img src={item.attachmentUrl} alt="Customer attachment" className="max-h-52 w-full object-contain" /> : null}</a> : null}</div></div>)}</div></section>)}</div>
      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 shadow-[0_-10px_30px_rgba(15,23,42,.05)]">
        <div className="mb-3 flex gap-2"><button onClick={() => setMode('whatsapp')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mode === 'whatsapp' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400'}`}>● WhatsApp</button><button onClick={() => setMode('email')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mode === 'email' ? 'bg-blue-50 text-blue-700' : 'text-slate-400'}`}>✉ Email</button></div>
        {mode === 'whatsapp' ? <div className="mb-3"><div className="mb-1.5 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">✨ Setu Guru suggested reply</p><span className="text-[10px] text-slate-400">Choose a starting point</span></div><select defaultValue="" onChange={(event) => { const index = Number(event.target.value); if (Number.isFinite(index) && ideas[index]) setMessage(ideas[index]); }} className="h-10 w-full rounded-xl border border-violet-100 bg-violet-50/60 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-violet-300"><option value="" disabled>Select suggested reply</option>{ideas.map((idea, index) => <option key={idea} value={index}>Option {index + 1} — {idea.slice(0, 72)}{idea.length > 72 ? '…' : ''}</option>)}</select></div> : <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Email subject" className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" />}

        {mode === 'whatsapp' && p.linkedInterakt && !p.whatsappReplyWindowOpen ? <div className={`rounded-2xl border p-3 ${p.whatsappTemplateConfigured ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${p.whatsappTemplateConfigured ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>!</span><div className="min-w-0 flex-1"><p className={`text-xs font-semibold ${p.whatsappTemplateConfigured ? 'text-amber-900' : 'text-slate-800'}`}>WhatsApp reply window closed</p><p className={`mt-1 text-[11px] leading-4 ${p.whatsappTemplateConfigured ? 'text-amber-800' : 'text-slate-600'}`}>{p.whatsappTemplateConfigured ? 'WhatsApp requires an approved template to restart this conversation. After the customer replies, normal free-text messaging, brochures and attachments open again.' : 'No approved Stark Packmate follow-up template is configured yet. An administrator must add the approved Interakt template before this conversation can be restarted from Setu Flow.'}</p>{p.whatsappTemplateConfigured ? <button onClick={restart} disabled={pending} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">{pending ? 'Sending…' : 'Restart with approved template'}</button> : null}</div></div></div> : <>
          <textarea ref={textareaRef} value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder={mode === 'whatsapp' ? 'Type a WhatsApp message…' : 'Write your email…'} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50" />
          {mode === 'whatsapp' ? <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEmojiOpen((value) => !value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">😀 Emoji</button><button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{uploading ? 'Uploading…' : '📎 Attach artwork / file'}</button><input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void stageAttachment(file); }} /></div>{emojiOpen ? <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-2">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="h-8 w-8 rounded-md text-base hover:bg-slate-50">{emoji}</button>)}</div> : null}{attachment ? <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-semibold text-emerald-800">📎 {attachment.fileName}</p><p className="text-[10px] text-emerald-700">Ready · {(attachment.fileSize / 1024 / 1024).toFixed(1)} MB</p></div><button type="button" onClick={() => setAttachment(null)} className="text-[10px] font-semibold text-emerald-800">Remove</button></div> : null}</div> : null}
          {mode === 'whatsapp' && brochures.length ? <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50/50 p-2.5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">📚 Brochure</p>{recommendedBrochure ? <p className="mt-1 truncate text-xs font-semibold text-slate-700">✨ Recommended: {recommendedBrochure.name}</p> : <p className="mt-1 text-[11px] text-slate-500">Choose a brochure when useful.</p>}{selectedBrochure ? <p className="mt-1 truncate text-[10px] font-semibold text-emerald-700">Attached: {selectedBrochure.name}</p> : null}</div><select value={brochureId} onChange={(event) => { setBrochureTouched(true); setBrochureId(event.target.value); }} className="h-9 max-w-[210px] rounded-lg border border-violet-100 bg-white px-2 text-[11px] font-semibold text-slate-700"><option value="">No brochure</option>{brochures.map((brochure) => <option key={brochure.id} value={brochure.id}>{brochure.recommended ? 'Recommended · ' : ''}{brochure.name}</option>)}</select></div></div> : null}
          {feedback ? <p className="mt-2 text-xs text-slate-600">{feedback}</p> : null}
          <div className="mt-3 flex justify-end gap-2">{mode === 'email' ? <><button onClick={email} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">Open email</button><button onClick={log} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Log sent</button></> : <button onClick={send} disabled={pending || uploading || (!message.trim() && !attachment && !brochureId) || !p.linkedInterakt} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-40">{sendLabel}</button>}</div>
        </>}
        {mode === 'whatsapp' && p.linkedInterakt && !p.whatsappReplyWindowOpen && feedback ? <p className="mt-2 text-xs text-slate-600">{feedback}</p> : null}
      </footer>
    </aside></div> : null}
  </>;
}
