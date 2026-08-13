type ConversationMessage = {
  id: string;
  event_type: string | null;
  direction: 'inbound' | 'outbound' | 'system';
  actor_type: string;
  actor_name: string | null;
  message_type: string | null;
  message_text: string | null;
  media_url: string | null;
  intelligence: { companyName?: string | null; brandName?: string | null; confidence?: number; evidence?: string } | null;
  received_at: string | null;
  sent_at: string | null;
  status: string;
};

type Props = {
  messages: ConversationMessage[];
  customerName: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function cleanInteractiveText(message: ConversationMessage) {
  const text = message.message_text ?? '';
  if (!text.startsWith('{')) return text;
  try {
    const parsed = JSON.parse(text) as Record<string, any>;
    const visible = parsed?.list_reply?.title ?? parsed?.button_reply?.title;
    if (visible) return String(visible);
    if (parsed?.type === 'nfm_reply' || parsed?.nfm_reply || text.includes('response_json') || text.includes('flow_token')) return '';
    return '';
  } catch {
    return text;
  }
}

function hasVisibleCustomerContent(message: ConversationMessage) {
  return message.direction === 'inbound' && (Boolean(cleanInteractiveText(message).trim()) || Boolean(message.media_url && /^https:\/\//i.test(message.media_url)));
}

function MessageBubble({ message, customerName, latest = false }: { message: ConversationMessage; customerName: string; latest?: boolean }) {
  const isCall = message.event_type === 'call_logged' || message.message_type === 'Call';
  if (isCall) {
    return <div className="mx-auto max-w-xl rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase text-blue-700">☎ Call logged · {message.actor_name || 'Setu Flow user'}</span><span className="text-[10px] text-slate-400">{formatDateTime(message.sent_at || message.received_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{message.message_text}</p></div>;
  }

  const inbound = message.direction === 'inbound';
  const text = cleanInteractiveText(message);
  const intelligence = message.intelligence;
  return <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}><div className={`${latest ? 'w-full max-w-none border border-blue-100 bg-blue-50/70' : `max-w-[82%] ${inbound ? 'bg-slate-100' : 'bg-emerald-50'}`} rounded-2xl px-3.5 py-3`}><div className="flex items-center justify-between gap-4"><span className={`text-[9px] font-black uppercase tracking-wider ${latest ? 'text-blue-700' : 'text-slate-500'}`}>{latest ? 'Latest customer response' : inbound ? message.actor_name || customerName || 'Customer' : message.actor_name || 'Setu Flow'}</span><span className="text-[9px] text-slate-400">{formatDateTime(message.received_at || message.sent_at)}</span></div>{message.media_url && /^https:\/\//i.test(message.media_url) ? <div className="mt-2"><img src={message.media_url} alt="Customer supplied attachment" className="max-h-72 rounded-xl border border-white object-contain" /><a href={message.media_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] font-bold text-blue-600">Open image ↗</a></div> : null}{text ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-800">{text}</p> : null}{intelligence && (intelligence.companyName || intelligence.brandName) ? <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-[10px] leading-4 text-violet-800">✨ Setu Guru: {intelligence.companyName ? `Possible company ${intelligence.companyName}. ` : ''}{intelligence.brandName ? `Possible brand ${intelligence.brandName}. ` : ''}{typeof intelligence.confidence === 'number' ? `${Math.round(intelligence.confidence * 100)}% confidence.` : ''}{intelligence.evidence ? ` ${intelligence.evidence}` : ''}</div> : null}</div></div>;
}

export function InboundConversationPanel({ messages, customerName }: Props) {
  if (messages.length === 0) {
    return <section><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Conversation</h3><span className="text-[10px] text-slate-400">0 activities</span></div><div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">No conversation has been imported for this contact yet.</div></section>;
  }

  const latestCustomerMessage = [...messages].reverse().find(hasVisibleCustomerContent) ?? null;
  const earlierMessages = latestCustomerMessage ? messages.filter((message) => message.id !== latestCustomerMessage.id) : messages;

  return <section>
    <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Conversation</h3><span className="text-[10px] text-slate-400">{messages.length} activities</span></div>
    <div className="space-y-2">
      {latestCustomerMessage ? <MessageBubble message={latestCustomerMessage} customerName={customerName} latest /> : <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">No customer response is available in the imported history yet.</div>}
      {earlierMessages.length ? <details className="rounded-xl border border-slate-200 bg-white px-3 py-2"><summary className="cursor-pointer text-[10px] font-bold text-slate-600">View earlier conversation · {earlierMessages.length} {earlierMessages.length === 1 ? 'activity' : 'activities'}</summary><div className="mt-3 space-y-3 border-t border-slate-100 pt-3">{earlierMessages.map((message) => <MessageBubble key={message.id} message={message} customerName={customerName} />)}</div></details> : null}
    </div>
  </section>;
}
