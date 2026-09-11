export type ComposeGuruAction = 'improve' | 'professional' | 'shorter' | 'warmer' | 'draft_reply' | 'draft_follow_up' | 'suggest_subject';

export type ComposeGuruCrmContext = {
  leadId: string | null;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  leadType: string | null;
  stageId: string | null;
  ownerUserId: string | null;
};

export function buildComposeGuruPrompt(input: {
  action: ComposeGuruAction;
  to: string[];
  subject: string;
  text: string;
  threadContext?: string;
  crmContext?: ComposeGuruCrmContext | null;
}) {
  const instruction: Record<ComposeGuruAction, string> = {
    improve: 'Improve the draft for clarity, structure, grammar, and business usefulness while preserving the writer’s meaning and tone.',
    professional: 'Rewrite the draft in a polished, confident, professional business tone without sounding robotic or overly formal.',
    shorter: 'Make the draft materially shorter and easier to scan while preserving all important facts, requests, dates, prices, and commitments.',
    warmer: 'Rewrite the draft to feel warmer and more relationship-oriented while remaining concise and professional.',
    draft_reply: 'Draft a concise reply based on the conversation context and CRM context. Do not invent commitments, pricing, dates, approvals, or facts.',
    draft_follow_up: 'Draft a concise follow-up email using the CRM and conversation context. Keep the next action clear and do not invent new commercial commitments.',
    suggest_subject: 'Return a concise business email subject line only. Do not include quotes, labels, explanations, or markdown.',
  };

  return [
    'You are Setu Guru inside Setu Mail.',
    'Your job is to help the user write business email. The user remains in control and you never send mail or change CRM records.',
    'Use CRM context only when it is explicitly provided. Never invent customer, quote, order, pricing, delivery, approval, or compliance facts.',
    'Write naturally, clearly, and like a capable human operator rather than an AI assistant.',
    instruction[input.action],
    '',
    `Recipients: ${input.to.join(', ') || '(none)'}`,
    `Current subject: ${input.subject || '(none)'}`,
    `Current draft:\n${input.text || '(empty)'}`,
    input.threadContext ? `Conversation context:\n${input.threadContext}` : 'Conversation context: none',
    `CRM context JSON:\n${JSON.stringify(input.crmContext ?? null, null, 2)}`,
    '',
    input.action === 'suggest_subject'
      ? 'Return only the subject line.'
      : 'Return only the proposed email body. Do not wrap it in markdown or add commentary before or after it.',
  ].join('\n');
}
