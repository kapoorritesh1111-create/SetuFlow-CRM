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

type GuruCapture = {
  label: string;
  value: string;
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

function inferCustomerIntent(messages: ConversationMessage[]): GuruCapture | null {
  const latestInbound = [...messages].reverse().find(hasVisibleCustomerContent);
  const text = latestInbound ? cleanInteractiveText(latestInbound).toLowerCase() : '';
  if (!text) return null;
  if (/\bmoq\b|minimum\s+order\s+quantity|minimum\s+qty/.test(text)) return { label: 'Intent', value: 'Asking about MOQ' };
  if (/\b(?:quote|quotation|price|pricing|cost|rate)\b/.test(text)) return { label: 'Intent', value: 'Asking about pricing' };
  if (/\b(?:sample|prototype|mockup)\b/.test(text)) return { label: 'Intent', value: 'Interested in sample / prototype' };
  if (/\b(?:catalog|catalogue|brochure|pic|picture|photo|image)\b/.test(text)) return { label: 'Intent', value: 'Wants a visual / catalog reference' };
  if (/\b(?:order|buy|need|require|requirement)\b/.test(text)) return { label: 'Intent', value: 'Commercial requirement detected' };
  return null;
}

function guruCaptures(messages: ConversationMessage[]) {
  const captures: GuruCapture[] = [];
  const intent = inferCustomerIntent(messages);
  if (intent) captures.push(intent);

  const latestCompany = [...messages].reverse().find((message) => message.intelligence?.companyName)?.intelligence;
  if (latestCompany?.companyName) captures.push({ label: 'Possible company', value: latestCompany.companyName });

  const latestBrand = [...messages].reverse().find((message) => message.intelligence?.brandName)?.intelligence;
  if (latestBrand?.brandName) captures.push({ label: 'Possible brand', value: latestBrand.brandName });

  return captures;
}

function MessageBubble({ message, customerName, latest = false }: { message: ConversationMessage; customerName: string; latest?: boolean }) {
  const isCall = message.event_type === 'call_logged' || message.message_type === 'Call';
  if (isCall) {
    return <div className="mx-auto max-w-xl rounded-card border border-info-border bg-info-bg px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-caption font-bold uppercase text-info-fg">☎ Call logged · {message.actor_name || 'Setu Flow user'}</span><span className="text-caption text-content-faint">{formatDateTime(message.sent_at || message.received_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-small leading-5 text-content-secondary">{message.message_text}</p></div>;
  }

  const inbound = message.direction === 'inbound';
  const text = cleanInteractiveText(message);
  const intelligence = message.intelligence;
  const surface = latest
    ? 'w-full max-w-none border border-info-border bg-info-bg'
    : `max-w-[82%] border border-line ${inbound ? 'bg-surface-2' : 'bg-success-bg'}`;

  return <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}><div className={`${surface} rounded-card px-3.5 py-3`}><div className="flex items-center justify-between gap-4"><span className={`text-caption font-bold uppercase ${latest ? 'text-info-fg' : 'text-content-muted'}`}>{latest ? 'Latest customer response' : inbound ? message.actor_name || customerName || 'Customer' : message.actor_name || 'Setu Flow'}</span><span className="text-caption text-content-faint">{formatDateTime(message.received_at || message.sent_at)}</span></div>{message.media_url && /^https:\/\//i.test(message.media_url) ? <div className="mt-2"><img src={message.media_url} alt="Customer supplied attachment" className="max-h-72 rounded-ctl border border-line object-contain" /><a href={message.media_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-caption font-bold text-content-brand">Open image ↗</a></div> : null}{text ? <p className="mt-1 whitespace-pre-wrap text-small leading-5 text-content-primary">{text}</p> : null}{intelligence && (intelligence.companyName || intelligence.brandName) ? <div className="mt-2 rounded-ctl border border-info-border bg-info-bg px-3 py-2 text-caption leading-4 text-info-fg">✨ Setu Guru: {intelligence.companyName ? `Possible company ${intelligence.companyName}. ` : ''}{intelligence.brandName ? `Possible brand ${intelligence.brandName}. ` : ''}{typeof intelligence.confidence === 'number' ? `${Math.round(intelligence.confidence * 100)}% confidence.` : ''}{intelligence.evidence ? ` ${intelligence.evidence}` : ''}</div> : null}</div></div>;
}

export function InboundConversationPanel({ messages, customerName }: Props) {
  if (messages.length === 0) {
    return <section><div className="mb-2 flex items-center justify-between"><h3 className="text-caption font-bold uppercase text-content-muted">Conversation</h3><span className="text-caption text-content-faint">0 imported activities</span></div><div className="rounded-card border border-dashed border-line px-4 py-6 text-center text-small text-content-muted">No conversation has been imported for this contact yet.</div></section>;
  }

  const latestCustomerMessage = [...messages].reverse().find(hasVisibleCustomerContent) ?? null;
  const captures = guruCaptures(messages);

  return <section>
    <div className="mb-2 flex items-center justify-between"><h3 className="text-caption font-bold uppercase text-content-muted">Conversation</h3><span className="text-caption text-content-faint">{messages.length} imported {messages.length === 1 ? 'activity' : 'activities'}</span></div>
    <div className="space-y-2">
      {latestCustomerMessage ? <MessageBubble message={latestCustomerMessage} customerName={customerName} latest /> : <div className="rounded-card border border-line bg-surface-2 px-3 py-2 text-caption text-content-muted">No customer response is available in the imported history yet.</div>}

      <div className="rounded-card border border-line bg-surface-2 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-bold uppercase text-content-brand">✨ Setu Guru captured</span>
          {captures.length ? captures.map((capture) => <span key={`${capture.label}:${capture.value}`} className="rounded-pill border border-line bg-surface-1 px-2 py-1 text-caption text-content-secondary"><strong>{capture.label}:</strong> {capture.value}</span>) : <span className="text-caption text-content-muted">No structured buyer detail has been extracted from the imported messages yet.</span>}
        </div>
      </div>

      <details className="rounded-card border border-line bg-surface-1 px-3 py-2">
        <summary className="cursor-pointer text-caption font-bold text-content-secondary">View full conversation · {messages.length} imported {messages.length === 1 ? 'activity' : 'activities'}</summary>
        <div className="mt-3 space-y-3 border-t border-line pt-3">{messages.map((message) => <MessageBubble key={message.id} message={message} customerName={customerName} />)}</div>
      </details>
    </div>
  </section>;
}
