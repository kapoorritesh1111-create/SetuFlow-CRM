'use client';

import { useMemo, useState } from 'react';

import { PendingSubmitButton } from '@/features/integrations/interakt/components/pending-submit-button';
import { sendStarkInteraktSalesFollowUp, sendStarkInteraktSalesText } from '@/features/integrations/interakt/sales-message-actions';

type Props = {
  rowId: string;
  customerName: string;
  companyName?: string | null;
  packagingType?: string | null;
  pouchType?: string | null;
  quantityText?: string | null;
  replyWindowOpen: boolean;
  canSend: boolean;
};

type Suggestion = {
  id: string;
  label: string;
  helper: string;
  message: string;
};

function clean(value: string | null | undefined) {
  return String(value ?? '').trim();
}

export function SalesMessageComposer({ rowId, customerName, companyName, packagingType, pouchType, quantityText, replyWindowOpen, canSend }: Props) {
  const suggestions = useMemo<Suggestion[]>(() => {
    const name = clean(customerName) || 'there';
    const company = clean(companyName);
    const packaging = clean(pouchType) || clean(packagingType);
    const quantity = clean(quantityText);
    const requirement = [packaging, quantity].filter(Boolean).join(' · ');
    const context = requirement || 'your packaging requirement';

    return [
      {
        id: 'advance',
        label: 'Acknowledge & move forward',
        helper: 'Best when the main requirement is already captured',
        message: `Hi ${name}, thank you for sharing your requirement${company ? ` for ${company}` : ''}. I have noted ${context}. We can help you take this forward. Please share the pouch dimensions and artwork if available, and I’ll guide you on pricing and next steps.`,
      },
      {
        id: 'quote-details',
        label: 'Ask for quote details',
        helper: 'Collect the details that improve pricing accuracy',
        message: `Hi ${name}, thanks for sharing the requirement for ${context}. To work out the right structure and pricing, please send the pouch size (width × height × gusset, if applicable), preferred material/finish, and delivery city. If your artwork is ready, you can share it here as well.`,
      },
      {
        id: 'sample',
        label: 'Paid sample / prototype',
        helper: 'Useful for small runs such as 10 pcs',
        message: `Hi ${name}, we can also evaluate a paid sample or prototype run, even for a small quantity. Please share the required pouch size, artwork/logo, and preferred material or finish. We’ll confirm feasibility, pricing and lead time before you proceed.`,
      },
      {
        id: 'general-info',
        label: 'General enquiry',
        helper: 'For customers asking “Can I get more info?”',
        message: `Hi ${name}, thank you for reaching out to Stark Packmate. We’d be happy to help. Please tell me what product you are packing, the packaging or pouch type you need, and your approximate quantity. If you already have artwork or a reference image, you can send it here too.`,
      },
      {
        id: 'follow-up',
        label: 'Professional follow-up',
        helper: 'For a warm enquiry that has gone quiet',
        message: `Hi ${name}, just following up on your packaging requirement${requirement ? ` for ${requirement}` : ''}. We have your initial details and can help you move toward pricing whenever you’re ready. Please share the size or artwork if available, and we’ll take it from there.`,
      },
    ];
  }, [customerName, companyName, packagingType, pouchType, quantityText]);

  const initial = suggestions[(clean(packagingType) || clean(pouchType)) ? 0 : 3]?.message ?? '';
  const [message, setMessage] = useState(initial);
  const [selectedId, setSelectedId] = useState((clean(packagingType) || clean(pouchType)) ? 'advance' : 'general-info');

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-3 py-2 ${replyWindowOpen ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[10px] font-black ${replyWindowOpen ? 'text-emerald-800' : 'text-blue-800'}`}>WhatsApp</p>
          <span className={`rounded-full bg-white px-2 py-0.5 text-[9px] font-bold ${replyWindowOpen ? 'text-emerald-700' : 'text-blue-700'}`}>
            {replyWindowOpen ? 'Free reply window open' : 'Approved template required'}
          </span>
        </div>
        <p className={`mt-1 text-[10px] leading-4 ${replyWindowOpen ? 'text-emerald-700' : 'text-blue-700'}`}>
          {replyWindowOpen
            ? 'Choose a professional Setu suggestion, edit it freely, or type your own response.'
            : 'The 24-hour reply window is closed. Use the approved follow-up below to reopen the WhatsApp conversation.'}
        </p>
      </div>

      {replyWindowOpen ? (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-violet-600">✨ Setu suggested replies</p>
              <span className="text-[9px] text-slate-400">Based on the captured requirement</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((suggestion) => {
                const active = selectedId === suggestion.id;
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => { setSelectedId(suggestion.id); setMessage(suggestion.message); }}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'}`}
                  >
                    <p className={`text-[10px] font-black ${active ? 'text-violet-800' : 'text-slate-800'}`}>{suggestion.label}</p>
                    <p className="mt-1 text-[9px] leading-4 text-slate-500">{suggestion.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <form action={sendStarkInteraktSalesText} className="space-y-2">
            <input type="hidden" name="rowId" value={rowId} />
            <label className="block text-[9px] font-black uppercase tracking-wide text-slate-500">
              Your message
              <textarea
                name="message"
                required
                maxLength={4096}
                rows={6}
                value={message}
                onChange={(event) => { setMessage(event.target.value); setSelectedId(''); }}
                placeholder="Type your WhatsApp reply…"
                className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] text-slate-400">Free text or suggestion · always editable before sending</p>
              <span className="text-[9px] font-bold text-emerald-700">{message.length}/4096</span>
            </div>
            <PendingSubmitButton
              disabled={!canSend || !message.trim()}
              idleLabel="Send WhatsApp"
              pendingLabel="Sending WhatsApp…"
              pendingDetail="Waiting for Interakt to accept your message"
              className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white"
            />
          </form>
        </>
      ) : null}

      <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" open={!replyWindowOpen}>
        <summary className="cursor-pointer text-[10px] font-bold text-slate-600">Use approved follow-up</summary>
        <div className="mt-2">
          <p className="mb-2 text-[9px] leading-4 text-slate-500">Setu Flow will use Stark Packmate’s approved qualification follow-up template. Sales does not need to manage template names or variables.</p>
          <form action={sendStarkInteraktSalesFollowUp}>
            <input type="hidden" name="rowId" value={rowId} />
            <input type="hidden" name="messagePreset" value="qualification_follow_up" />
            <PendingSubmitButton
              disabled={!canSend}
              idleLabel="Send approved follow-up"
              pendingLabel="Sending template…"
              pendingDetail="Waiting for Interakt to accept the approved message"
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700"
            />
          </form>
        </div>
      </details>
    </div>
  );
}
