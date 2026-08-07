export type MailtrapEmailAddress = {
  email: string;
  name?: string;
};

export type MailtrapEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string | null;
  bcc?: string[];
  category?: string;
  customVariables?: Record<string, string>;
};

export type MailtrapEmailResult =
  | { ok: true; provider: 'mailtrap'; messageId?: string }
  | { ok: false; provider: 'mailtrap'; error: string };

function parseEmailAddress(value: string): MailtrapEmailAddress {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (!match) return { email: trimmed };
  const name = match[1]?.replace(/^[ '\"]|[ '\"]$/g, '').trim();
  return { email: match[2].trim(), ...(name ? { name } : {}) };
}

function toAddresses(value: string | string[]) {
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => parseEmailAddress(item)).filter((item) => item.email.length > 0);
}

export function getMailtrapFromAddress() {
  return process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.MAILTRAP_FROM_EMAIL ?? 'help@setugroups.com';
}

export function getMailtrapProviderSummary() {
  return {
    provider: 'mailtrap' as const,
    from: getMailtrapFromAddress(),
    hasMailtrap: Boolean(process.env.MAILTRAP_API_KEY),
    sandboxMode: String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true',
  };
}

export async function sendMailtrapEmail(input: MailtrapEmailInput): Promise<MailtrapEmailResult> {
  const apiKey = process.env.MAILTRAP_API_KEY;
  if (!apiKey) {
    return { ok: false, provider: 'mailtrap', error: 'MAILTRAP_API_KEY is not configured.' };
  }

  const useSandbox = String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true';
  const sandboxId = process.env.MAILTRAP_SANDBOX_ID;
  if (useSandbox && !sandboxId) {
    return { ok: false, provider: 'mailtrap', error: 'MAILTRAP_SANDBOX_ID is required when MAILTRAP_USE_SANDBOX is true.' };
  }

  const endpoint = useSandbox
    ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(sandboxId ?? '')}`
    : 'https://send.api.mailtrap.io/api/send';

  const from = parseEmailAddress(input.from ?? getMailtrapFromAddress());
  const to = toAddresses(input.to);
  if (!from.email || !to.length) {
    return { ok: false, provider: 'mailtrap', error: 'A valid from and recipient email address are required.' };
  }

  const body: Record<string, unknown> = {
    from: { email: from.email, name: input.fromName ?? from.name ?? 'SETU Flow' },
    to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  };

  if (input.replyTo) body.reply_to = parseEmailAddress(input.replyTo);
  if (input.bcc?.length) body.bcc = toAddresses(input.bcc);
  if (input.category) body.category = input.category;
  if (input.customVariables && Object.keys(input.customVariables).length > 0) body.custom_variables = input.customVariables;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Mailtrap rejected the message.');
      return { ok: false, provider: 'mailtrap', error: errorText.slice(0, 1000) };
    }

    const data = await response.json().catch(() => ({}));
    return {
      ok: true,
      provider: 'mailtrap',
      messageId: data?.message_ids?.[0] ?? data?.message_id ?? undefined,
    };
  } catch (error) {
    return {
      ok: false,
      provider: 'mailtrap',
      error: error instanceof Error ? error.message : 'Unknown Mailtrap delivery error.',
    };
  }
}
