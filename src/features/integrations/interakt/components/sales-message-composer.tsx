'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';

import { sendStarkInteraktSalesFollowUp, sendStarkInteraktSalesText } from '@/features/integrations/interakt/sales-message-actions';

type BrochureOption = {
  id: string;
  name: string;
  description?: string | null;
  family_names?: string[];
  family_slugs?: string[];
  category_names?: string[];
};

type Props = {
  rowId: string;
  customerName: string;
  companyName?: string | null;
  packagingType?: string | null;
  pouchType?: string | null;
  quantityText?: string | null;
  replyWindowOpen: boolean;
  canSend: boolean;
  brochures?: BrochureOption[];
};

type Suggestion = {
  id: string;
  label: string;
  helper: string;
  message: string;
};

type Notice = { tone: 'success' | 'error'; message: string } | null;

function clean(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function normalized(value: string | null | undefined) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function brochureRecommended(brochure: BrochureOption, context: string) {
  const target = normalized(context);
  if (!target) return false;
  return [...(brochure.family_names ?? []), ...(brochure.family_slugs ?? []), ...(brochure.category_names ?? [])].some((value) => {
    const family = normalized(value);
    return Boolean(family && (target.includes(family) || family.includes(target)));
  });
}

export function SalesMessageComposer({ rowId, customerName, companyName, packagingType, pouchType, quantityText, replyWindowOpen, canSend, brochures = [] }: Props) {
  const suggestions = useMemo<Suggestion[]>(() => {
    const name = clean(customerName) || 'there';
    const company = clean(companyName);
    const packaging = clean(pouchType) || clean(packagingType);
    const quantity = clean(quantityText);
    const requirement = [packaging, quantity].filter(Boolean).join(' · ');
    const context = requirement || 'your packaging requirement';

    return [
      { id: 'advance', label: 'Acknowledge & move forward', helper: 'Best when the main requirement is already captured', message: `Hi ${name}, thank you for sharing your requirement${company ? ` for ${company}` : ''}. I have noted ${context}. We can help you take this forward. Please share the pouch dimensions and artwork if available, and I’ll guide you on pricing and next steps.` },
      { id: 'quote-details', label: 'Ask for quote details', helper: 'Collect the details that improve pricing accuracy', message: `Hi ${name}, thanks for sharing the requirement for ${context}. To work out the right structure and pricing, please send the pouch size (width × height × gusset, if applicable), preferred material/finish, and delivery city. If your artwork is ready, you can share it here as well.` },
      { id: 'sample', label: 'Paid sample / prototype', helper: 'Useful for small runs such as 10 pcs', message: `Hi ${name}, we can also evaluate a paid sample or prototype run, even for a small quantity. Please share the required pouch size, artwork/logo, and preferred material or finish. We’ll confirm feasibility, pricing and lead time before you proceed.` },
      { id: 'general-info', label: 'General enquiry', helper: 'For customers asking “Can I get more info?”', message: `Hi ${name}, thank you for reaching out to Stark Packmate. We’d be happy to help. Please tell me what product you are packing, the packaging or pouch type you need, and your approximate quantity. If you already have artwork or a reference image, you can send it here too.` },
      { id: 'follow-up', label: 'Professional follow-up', helper: 'For a warm enquiry that has gone quiet', message: `Hi ${name}, just following up on your packaging requirement${requirement ? ` for ${requirement}` : ''}. We have your initial details and can help you move toward pricing whenever you’re ready. Please share the size or artwork if available, and we’ll take it from there.` },
    ];
  }, [customerName, companyName, packagingType, pouchType, quantityText]);

  const productContext = clean(pouchType) || clean(packagingType);
  const defaultSelectedId = (clean(packagingType) || clean(pouchType)) ? 'advance' : 'general-info';
  const initial = suggestions[defaultSelectedId === 'advance' ? 0 : 3]?.message ?? '';
  const [availableBrochures, setAvailableBrochures] = useState<BrochureOption[]>(brochures);
  const [brochureId, setBrochureId] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [isSending, startSending] = useTransition();
  const [isFollowingUp, startFollowingUp] = useTransition();
  const [message, setMessage] = useState(initial);
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const [draftRowId, setDraftRowId] = useState(rowId);
  const contextChanged = draftRowId !== rowId;

  useEffect(() => {
    if (brochures.length) {
      setAvailableBrochures(brochures);
      return;
    }
    let active = true;
    void fetch('/api/catalog-brochures', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { brochures: [] })
      .then((payload) => { if (active && Array.isArray(payload.brochures)) setAvailableBrochures(payload.brochures); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [brochures]);

  useEffect(() => {
    if (draftRowId === rowId) return;
    setDraftRowId(rowId);
    setMessage(initial);
    setSelectedId(defaultSelectedId);
    setBrochureId('');
    setNotice(null);
  }, [defaultSelectedId, draftRowId, initial, rowId]);

  const orderedBrochures = useMemo(() => [...availableBrochures].sort((a, b) => Number(brochureRecommended(b, productContext)) - Number(brochureRecommended(a, productContext))), [availableBrochures, productContext]);
  const recommended = orderedBrochures.find((brochure) => brochureRecommended(brochure, productContext)) ?? null;
  const selectedSuggestion = suggestions.find((suggestion) => suggestion.id === selectedId) ?? null;
  const selectedBrochure = orderedBrochures.find((brochure) => brochure.id === brochureId) ?? null;

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contextChanged) {
      setNotice({ tone: 'error', message: 'Customer changed. Review the refreshed reply before sending.' });
      return;
    }
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    startSending(() => {
      void sendStarkInteraktSalesText(formData).then((result) => {
        setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
      }).catch(() => setNotice({ tone: 'error', message: 'The WhatsApp message could not be sent. Please try again.' }));
    });
  }

  function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contextChanged) {
      setNotice({ tone: 'error', message: 'Customer changed. Review the selected inquiry before sending.' });
      return;
    }
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    startFollowingUp(() => {
      void sendStarkInteraktSalesFollowUp(formData).then((result) => {
        setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
      }).catch(() => setNotice({ tone: 'error', message: 'The approved WhatsApp follow-up could not be sent. Please try again.' }));
    });
  }

  if (contextChanged) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4" role="status" aria-live="polite">
        <p className="text-xs font-bold text-blue-900">Preparing reply for {clean(customerName) || 'selected customer'}…</p>
        <p className="mt-1 text-[10px] leading-4 text-blue-700">The previous customer draft is being cleared before messaging is enabled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notice ? (
        <div role="status" className={`rounded-xl border px-3 py-2.5 text-xs ${notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-bold">{notice.tone === 'success' ? 'Message sent' : 'Could not send message'}</p><p className="mt-1 leading-5">{notice.message}</p></div>
            <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-[11px] font-bold">Dismiss</button>
          </div>
        </div>
      ) : null}

      <div className={`rounded-xl border px-3 py-2 ${replyWindowOpen ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[10px] font-bold ${replyWindowOpen ? 'text-emerald-800' : 'text-blue-800'}`}>WhatsApp</p>
          <span className={`rounded-full bg-white px-2 py-0.5 text-[9px] font-bold ${replyWindowOpen ? 'text-emerald-700' : 'text-blue-700'}`}>{replyWindowOpen ? 'Free reply window open' : 'Approved template required'}</span>
        </div>
        <p className={`mt-1 text-[10px] leading-4 ${replyWindowOpen ? 'text-emerald-700' : 'text-blue-700'}`}>{replyWindowOpen ? 'Setu has prepared one recommended reply. Edit it if needed, add a brochure only when useful, then send.' : 'The 24-hour reply window is closed. Use the approved follow-up below to reopen the WhatsApp conversation.'}</p>
      </div>

      {replyWindowOpen ? (
        <form onSubmit={submitMessage} className="space-y-3">
          <input type="hidden" name="rowId" value={rowId} />
          <input type="hidden" name="draftRowId" value={draftRowId} />

          <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wide text-violet-600">✨ {selectedSuggestion ? 'Setu recommended reply' : 'Custom reply'}</p>
                <p className="mt-0.5 text-xs font-bold text-violet-950">{selectedSuggestion?.label || 'Edited by you'}</p>
                <p className="mt-0.5 text-[9px] leading-4 text-violet-700">{selectedSuggestion?.helper || 'Your edits are preserved. Choose another reply style only if you want to replace this draft.'}</p>
              </div>
              <label className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-violet-600">Change reply
                <select value={selectedId} onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedId(nextId);
                  const next = suggestions.find((suggestion) => suggestion.id === nextId);
                  if (next) setMessage(next.message);
                  setNotice(null);
                }} className="mt-1 block h-9 max-w-[230px] rounded-lg border border-violet-200 bg-white px-2.5 text-[10px] font-semibold normal-case text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                  {!selectedSuggestion ? <option value="">Custom reply</option> : null}
                  {suggestions.map((suggestion) => <option key={suggestion.id} value={suggestion.id}>{suggestion.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          <label className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">Your message
            <textarea name="message" required maxLength={4096} rows={5} value={message} onChange={(event) => { setMessage(event.target.value); setSelectedId(''); setNotice(null); }} placeholder="Type your WhatsApp reply…" className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>

          {orderedBrochures.length ? (
            <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" open={Boolean(brochureId)}>
              <summary className="cursor-pointer text-[10px] font-bold text-slate-600">📎 Attach brochure <span className="font-medium text-slate-400">· {selectedBrochure?.name || 'optional'}</span></summary>
              <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Catalog / brochure
                <select name="brochureId" value={brochureId} onChange={(event) => { setBrochureId(event.target.value); setNotice(null); }} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  <option value="">No brochure</option>
                  {orderedBrochures.map((brochure) => <option key={brochure.id} value={brochure.id}>{brochureRecommended(brochure, productContext) ? 'Recommended · ' : ''}{brochure.name}</option>)}
                </select>
                {recommended ? <span className="mt-1 block text-[9px] font-semibold normal-case tracking-normal text-violet-600">✨ Recommended for this requirement: {recommended.name}</span> : <span className="mt-1 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Add a secure catalog link only when it helps this conversation.</span>}
              </label>
            </details>
          ) : null}

          <div className="flex items-center justify-between gap-2"><p className="text-[9px] text-slate-400">Review the customer name and requirement before sending.</p><span className="text-[9px] font-bold text-emerald-700">{message.length}/4096</span></div>
          <button type="submit" disabled={!canSend || !message.trim() || isSending || contextChanged} className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isSending ? 'Sending WhatsApp…' : brochureId ? 'Send WhatsApp + brochure' : 'Send WhatsApp'}</button>
        </form>
      ) : null}

      <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" open={!replyWindowOpen}>
        <summary className="cursor-pointer text-[10px] font-bold text-slate-600">Use approved follow-up</summary>
        <div className="mt-2"><p className="mb-2 text-[9px] leading-4 text-slate-500">Use Stark Packmate’s approved qualification follow-up template. Catalog links can be added after the customer replies and the free reply window reopens.</p><form onSubmit={submitFollowUp}><input type="hidden" name="rowId" value={rowId} /><input type="hidden" name="draftRowId" value={draftRowId} /><input type="hidden" name="messagePreset" value="qualification_follow_up" /><button type="submit" disabled={!canSend || isFollowingUp || contextChanged} className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{isFollowingUp ? 'Sending approved follow-up…' : 'Send approved follow-up'}</button></form></div>
      </details>
    </div>
  );
}
