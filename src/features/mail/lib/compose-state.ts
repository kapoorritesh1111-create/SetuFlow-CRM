export type MailMessage = {
  id: string; thread_id: string | null; direction: 'inbound' | 'outbound';
  status: string; folder: string; from_address: string; to_addresses: string[];
  cc_addresses: string[]; bcc_addresses: string[]; subject: string;
  text_body: string | null; is_read: boolean; is_starred: boolean; created_at: string;
  sent_at?: string | null; received_at?: string | null; draft_saved_at?: string | null;
  updated_at?: string;
};
export type MailSignature = {
  id: string; name: string; text_signature: string | null;
  html_signature: string | null; is_default: boolean;
};
export type DraftInput = {
  to: string[]; cc: string[]; bcc: string[]; subject: string; text: string;
  threadId: string | null;
};

export function mergeSavedDraft(messages: MailMessage[], draft: MailMessage): MailMessage[] {
  return [draft, ...messages.filter((message) => message.id !== draft.id)];
}

export function restoreDraft<T extends { message_id: string | null }>(message: MailMessage, attachments: T[]) {
  return {
    to: (message.to_addresses ?? []).join(', '),
    cc: (message.cc_addresses ?? []).join(', '),
    bcc: (message.bcc_addresses ?? []).join(', '),
    subject: message.subject || '', body: message.text_body || '',
    threadId: message.thread_id,
    attachments: attachments.filter((attachment) => attachment.message_id === message.id),
  };
}

async function persistDraft(id: string | null, input: DraftInput): Promise<MailMessage> {
  const response = await fetch('/api/mail/drafts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...input }),
  });
  const payload = await response.json() as { draft?: MailMessage; error?: string };
  if (!response.ok || !payload.draft?.id || payload.draft.status !== 'draft') {
    throw new Error(payload.error || 'Unable to save draft. Your message is still open.');
  }
  return payload.draft;
}

// Each composer gets its own queue. Overlapping autosave/close/send requests must
// reuse the first returned ID, never create two drafts or overwrite a newer edit.
export function createDraftSession(
  initialId: string | null = null,
  persist: (id: string | null, input: DraftInput) => Promise<MailMessage> = persistDraft,
) {
  let id = initialId;
  let tail: Promise<unknown> = Promise.resolve();
  let pendingCount = 0;
  return {
    getId: () => id,
    hasPending: () => pendingCount > 0,
    save(input: DraftInput): Promise<MailMessage> {
      const snapshot = { ...input, to: [...input.to], cc: [...input.cc], bcc: [...input.bcc] };
      ++pendingCount;
      const pending = tail.catch(() => undefined).then(async () => {
        const draft = await persist(id, snapshot);
        id = draft.id;
        return draft;
      });
      const settled = pending.finally(() => { --pendingCount; });
      tail = settled;
      return settled;
    },
  };
}

export async function persistSignature(text: string): Promise<MailSignature> {
  const response = await fetch('/api/mail/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Default signature', text }),
  });
  const payload = await response.json() as { signature?: MailSignature; error?: string };
  if (!response.ok || !payload.signature?.id) {
    throw new Error(payload.error || 'Unable to save signature. Please try again.');
  }
  return payload.signature;
}
