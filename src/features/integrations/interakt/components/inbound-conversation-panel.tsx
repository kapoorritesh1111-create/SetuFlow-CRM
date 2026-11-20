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

type CapturedRequirement = {
  companyName?: string | null;
  brandName?: string | null;
  packagingType?: string | null;
  pouchType?: string | null;
  quantityText?: string | null;
  industry?: string | null;
  dimensionsPrint?: string | null;
  deliveryLocation?: string | null;
  buyingTimeline?: string | null;
};

type EvidenceAnswer = { label: string; value: string };

type Props = {
  messages: ConversationMessage[];
  customerName: string;
  captured?: CapturedRequirement;
  evidenceAnswers?: EvidenceAnswer[];
};

type GuruCapture = { label: string; value: string };

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function messageTime(message: ConversationMessage) {
  const value = message.received_at || message.sent_at;
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function cleanInteractiveText(message: ConversationMessage) {
  const text = message.message_text ?? '';
  if (!text.startsWith('{') && !text.startsWith('[')) return text;
  try {
    const parsed = JSON.parse(text) as any;
    if (Array.isArray(parsed)) {
      const body = parsed.find((part: any) => part?.type === 'body');
      const values = Array.isArray(body?.parameters)
        ? body.parameters.map((parameter: any) => String(parameter?.text ?? '').trim()).filter(Boolean)
        : [];
      if (message.message_type === 'Template' && values.length >= 2) {
        return `Hello ${values[0]}, thank you for contacting Stark Packmate.\nWe are following up regarding your packaging requirement:\n${values[1]}\nPlease reply to this message and our team will continue assisting you.`;
      }
      return values.join('\n');
    }
    const visible = parsed?.list_reply?.title ?? parsed?.button_reply?.title;
    if (visible) return String(visible);
    if (parsed?.type === 'nfm_reply' || parsed?.nfm_reply || text.includes('response_json') || text.includes('flow_token')) return '';
    return '';
  } catch {
    return text;
  }
}

function normalizedVisibleText(message: ConversationMessage) {
  return cleanInteractiveText(message).replace(/\s+/g, ' ').trim().toLowerCase();
}

function hasVisibleCustomerContent(message: ConversationMessage) {
  return message.direction === 'inbound' && (Boolean(cleanInteractiveText(message).trim()) || Boolean(message.media_url && /^https:\/\//i.test(message.media_url)));
}

function dedupeDisplayMessages(messages: ConversationMessage[]) {
  const visible: ConversationMessage[] = [];
  let collapsed = 0;
  for (const message of messages) {
    const previous = visible[visible.length - 1];
    const currentText = normalizedVisibleText(message);
    const previousText = previous ? normalizedVisibleText(previous) : '';
    const currentAt = messageTime(message);
    const previousAt = previous ? messageTime(previous) : null;
    const repeatedQuickReply = Boolean(
      previous
      && currentText
      && currentText === previousText
      && message.direction === previous.direction
      && currentAt != null
      && previousAt != null
      && Math.abs(currentAt - previousAt) <= 10_000
    );
    if (repeatedQuickReply) {
      collapsed += 1;
      continue;
    }
    visible.push(message);
  }
  return { messages: visible, collapsed };
}

function inferCustomerIntent(messages: ConversationMessage[]): GuruCapture | null {
  const inboundTexts = messages.filter(hasVisibleCustomerContent).map((message) => cleanInteractiveText(message).toLowerCase()).reverse();
  for (const text of inboundTexts) {
    if (/\bmoq\b|minimum\s+order\s+quantity|minimum\s+qty/.test(text)) return { label: 'Intent', value: 'Asking about MOQ' };
    if (/\b(?:quote|quotation|price|pricing|cost|rate)\b/.test(text)) return { label: 'Intent', value: 'Asking about pricing' };
    if (/\b(?:sample|prototype|mockup)\b/.test(text)) return { label: 'Intent', value: 'Interested in sample / prototype' };
    if (/\b(?:catalog|catalogue|brochure|pic|picture|photo|image)\b/.test(text)) return { label: 'Intent', value: 'Wants a visual / catalog reference' };
    if (/\b(?:order|buy|need|require|requirement)\b/.test(text)) return { label: 'Intent', value: 'Commercial requirement detected' };
  }
  return null;
}

function inferIndustry(messages: ConversationMessage[]) {
  const known = [
    'food and beverage', 'food & beverage', 'health / supplements', 'health and supplements', 'supplements',
    'pharma', 'pharmaceutical', 'cosmetics', 'beauty', 'personal care', 'pet food', 'spices', 'snacks',
    'tea & coffee', 'tea and coffee', 'dry fruits', 'confectionery', 'frozen food', 'dairy',
  ];
  for (const message of [...messages].reverse()) {
    if (message.direction !== 'inbound') continue;
    const text = normalizedVisibleText(message);
    if (known.includes(text)) return cleanInteractiveText(message).trim();
  }
  return null;
}

function inferPackSize(messages: ConversationMessage[]) {
  for (const message of [...messages].reverse()) {
    if (message.direction !== 'inbound') continue;
    const text = cleanInteractiveText(message).trim();
    if (/^\d+(?:\.\d+)?\s*(?:g|gm|gms|gram|grams|kg|kgs|ml|l|litre|liter|litres|liters)$/i.test(text)) return text;
  }
  return null;
}

function requirementCaptures(messages: ConversationMessage[], captured: CapturedRequirement) {
  const values: Array<GuruCapture | null> = [
    captured.companyName ? { label: 'Company', value: captured.companyName } : null,
    captured.brandName ? { label: 'Brand', value: captured.brandName } : null,
    captured.packagingType ? { label: 'Packaging', value: captured.packagingType } : null,
    captured.pouchType ? { label: 'Pouch type', value: captured.pouchType } : null,
    captured.quantityText ? { label: 'Quantity', value: captured.quantityText } : null,
    (captured.industry || inferIndustry(messages)) ? { label: 'Industry', value: captured.industry || inferIndustry(messages)! } : null,
    captured.dimensionsPrint ? { label: 'Dimensions / print', value: captured.dimensionsPrint } : null,
    captured.deliveryLocation ? { label: 'Delivery', value: captured.deliveryLocation } : null,
    captured.buyingTimeline ? { label: 'Timeline', value: captured.buyingTimeline } : null,
    inferPackSize(messages) ? { label: 'Possible pack size', value: inferPackSize(messages)! } : null,
    inferCustomerIntent(messages),
  ];
  const seen = new Set<string>();
  return values.filter((item): item is GuruCapture => {
    if (!item?.value) return false;
    const key = `${item.label}:${item.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function MessageBubble({ message, customerName, latest = false }: { message: ConversationMessage; customerName: string; latest?: boolean }) {
  const isInteraktGap = message.event_type === 'interakt_manual_outbound_gap';
  if (isInteraktGap) {
    return <div className="flex justify-end"><div className="max-w-[82%] rounded-card border border-amber-200 bg-amber-50 px-3.5 py-3"><div className="flex items-center justify-between gap-4"><span className="text-caption font-bold uppercase text-amber-800">Interakt inbox · {message.actor_name || 'Agent'}</span><span className="text-caption text-amber-700/70">{formatDateTime(message.sent_at || message.received_at)}</span></div><p className="mt-1 text-small leading-5 text-amber-900">Outbound message detected from the Interakt conversation, but Interakt did not provide the message content to Setu Flow.</p></div></div>;
  }

  const isCall = message.event_type === 'call_logged' || message.message_type === 'Call';
  if (isCall) {
    return <div className="mx-auto max-w-xl rounded-card border border-info-border bg-info-bg px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-caption font-bold uppercase text-info-fg">☎ Call logged · {message.actor_name || 'Setu Flow user'}</span><span className="text-caption text-content-faint">{formatDateTime(message.sent_at || message.received_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-small leading-5 text-content-secondary">{message.message_text}</p></div>;
  }

  const inbound = message.direction === 'inbound';
  const text = cleanInteractiveText(message);
  const intelligence = message.intelligence;
  const surface = latest
    ? 'w-full max-w-none border border-line bg-surface-1'
    : `max-w-[82%] border border-line ${inbound ? 'bg-surface-2' : 'bg-success-bg'}`;

  return <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}><div className={`${surface} rounded-card px-3.5 py-3`}><div className="flex items-center justify-between gap-4"><span className={`text-caption font-bold uppercase ${latest ? 'text-content-brand' : 'text-content-muted'}`}>{latest ? 'Latest reply' : inbound ? message.actor_name || customerName || 'Customer' : message.actor_name || 'Setu Flow'}</span><span className="text-caption text-content-faint">{formatDateTime(message.received_at || message.sent_at)}</span></div>{message.media_url && /^https:\/\//i.test(message.media_url) ? <div className="mt-2"><img src={message.media_url} alt="Customer supplied attachment" className="max-h-72 rounded-ctl border border-line object-contain" /><a href={message.media_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-caption font-bold text-content-brand">Open image ↗</a></div> : null}{text ? <p className="mt-1 whitespace-pre-wrap text-small leading-5 text-content-primary">{text}</p> : null}{intelligence && (intelligence.companyName || intelligence.brandName) ? <div className="mt-2 rounded-ctl border border-info-border bg-info-bg px-3 py-2 text-caption leading-4 text-info-fg">✨ Setu Guru: {intelligence.companyName ? `Possible company ${intelligence.companyName}. ` : ''}{intelligence.brandName ? `Possible brand ${intelligence.brandName}. ` : ''}{typeof intelligence.confidence === 'number' ? `${Math.round(intelligence.confidence * 100)}% confidence.` : ''}{intelligence.evidence ? ` ${intelligence.evidence}` : ''}</div> : null}</div></div>;
}

export function InboundConversationPanel({ messages, customerName, captured = {}, evidenceAnswers = [] }: Props) {
  if (messages.length === 0) {
    return <section><div className="mb-2 flex items-center justify-between"><h3 className="text-caption font-bold uppercase text-content-muted">Conversation intelligence</h3><span className="text-caption text-content-faint">0 imported activities</span></div><div className="rounded-card border border-dashed border-line px-4 py-6 text-center text-small text-content-muted">No conversation has been imported for this contact yet.</div></section>;
  }

  const display = dedupeDisplayMessages(messages);
  const latestCustomerMessage = [...display.messages].reverse().find(hasVisibleCustomerContent) ?? null;
  const captures = requirementCaptures(display.messages, captured);
  const interaktGapCount = display.messages.filter((message) => message.event_type === 'interakt_manual_outbound_gap').length;

  return <section className="space-y-3">
    <div className="flex items-center justify-between rounded-card bg-success-bg px-4 py-3"><h3 className="text-sm font-bold text-content-primary">Customer conversation</h3><span className="text-xs font-semibold text-success-fg">{display.messages.length} activities{display.collapsed ? ` · ${display.collapsed} repeated messages collapsed` : ''}</span></div>
    <div className="max-h-[540px] space-y-3 overflow-y-auto rounded-card border border-line bg-surface-2 p-4" aria-label="View full conversation">
      {display.messages.map(message=><MessageBubble key={message.id} message={message} customerName={customerName}/>)}
    </div>
    <details className="rounded-card border border-line bg-surface-1 px-4 py-3">
      <summary className="cursor-pointer text-xs font-bold text-content-secondary">Conversation intelligence · captured requirements and sync gaps</summary>
      <div className="mt-3 space-y-3 text-xs">
        {interaktGapCount ? <p className="rounded-card border border-warning-border bg-warning-bg p-3 text-warning-fg"><strong>Interakt sync gap detected.</strong> {interaktGapCount} outbound activities are missing message content in the provider history; they have not been silently hidden.</p> : null}
        <div className="rounded-card border border-info-border bg-info-bg p-3">
          <p className="font-bold text-info-fg">Setu Guru understood</p>
          <div className="mt-2 flex flex-wrap gap-2">{captures.map(capture=><span key={capture.label+capture.value} className="rounded-card border border-line bg-surface-1 p-2"><strong>{capture.label}:</strong> {capture.value}</span>)}</div>
          {evidenceAnswers.length?<details className="mt-3"><summary className="cursor-pointer font-bold">View captured evidence ({evidenceAnswers.length})</summary><div className="mt-2 space-y-1">{evidenceAnswers.map((entry:any,i:number)=><div key={i} className="rounded-card bg-surface-1 p-2">{String(entry?.answer||entry?.value||entry?.text||'Evidence recorded')}</div>)}</div></details>:null}
        </div>
      </div>
    </details>
  </section>;
}
