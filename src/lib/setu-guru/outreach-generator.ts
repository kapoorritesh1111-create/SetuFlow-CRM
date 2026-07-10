import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';

export type OutreachChannel = 'whatsapp' | 'email' | 'linkedin';
export type OutreachGoal = 'send_catalog' | 'book_meeting' | 'follow_up_quote' | 'request_supplier_pricing';
export type OutreachTone = 'short' | 'warm' | 'professional' | 'trade_show_follow_up';

export type OutreachDraftInput = {
  leadId: string;
  channel: OutreachChannel;
  goal: OutreachGoal;
  tone: OutreachTone;
  senderName?: string | null;
};

export type OutreachDraft = {
  leadId: string;
  channel: OutreachChannel;
  goal: OutreachGoal;
  tone: OutreachTone;
  subject: string | null;
  body: string;
  productsReferenced: string[];
  usedFacts: string[];
};

const GOAL_LABEL: Record<OutreachGoal, string> = {
  send_catalog: 'send the catalog and starter pricing',
  book_meeting: 'book a short meeting',
  follow_up_quote: 'follow up on the quote',
  request_supplier_pricing: 'request supplier pricing',
};

function greeting(tone: OutreachTone, contactName: string | null) {
  const name = contactName || 'there';
  if (tone === 'short') return `Hi ${name},`;
  if (tone === 'trade_show_follow_up') return `Hi ${name}, this is a quick follow-up from the trade show.`;
  if (tone === 'professional') return `Dear ${name},`;
  return `Hi ${name}, hope you're doing well.`;
}

function closing(tone: OutreachTone, senderName: string | null) {
  const sender = senderName ? `\n\n${senderName}` : '';
  if (tone === 'professional') return `Kind regards,${sender}`;
  return `Best,${sender}`;
}

/**
 * Composes an outreach draft entirely from stored CRM fields and the org ICP
 * profile. Never invents certifications, pricing, claims, or attendance
 * details, and never sends anything — the caller is responsible for
 * persisting the draft (status: 'draft') and for the human review/send step.
 */
export async function generateOutreachDraft(orgId: string, input: OutreachDraftInput): Promise<OutreachDraft | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const [{ data: lead, error }, icp, { data: organization }] = await Promise.all([
    client
      .from('leads')
      .select('id,company_name,contact_name,country,products_or_needs,main_product_category,trade_show_name,lead_type')
      .eq('organization_id', orgId)
      .eq('id', input.leadId)
      .maybeSingle(),
    getIcpProfile(orgId),
    client.from('organizations').select('name').eq('id', orgId).maybeSingle(),
  ]);

  if (error) throw error;
  if (!lead) return null;

  const senderName = input.senderName || organization?.name || 'Setu Flow';
  const usedFacts: string[] = [];

  const leadProductTerm = lead.products_or_needs || lead.main_product_category;
  const icpProductList = icp?.products ?? [];
  const productsReferenced: string[] = [];
  if (leadProductTerm) {
    productsReferenced.push(leadProductTerm);
    usedFacts.push(`lead.products_or_needs = "${leadProductTerm}"`);
  } else if (icpProductList.length) {
    productsReferenced.push(...icpProductList.slice(0, 3));
    usedFacts.push('icp.products (no product recorded on the lead yet)');
  }

  const productPhrase = productsReferenced.length
    ? productsReferenced.slice(0, 3).join(', ')
    : 'our product range';

  const marketPhrase = lead.country ? ` in ${lead.country}` : '';
  if (lead.country) usedFacts.push(`lead.country = "${lead.country}"`);

  const tradeShowPhrase = lead.trade_show_name ? ` It was great connecting at ${lead.trade_show_name}.` : '';
  if (lead.trade_show_name) usedFacts.push(`lead.trade_show_name = "${lead.trade_show_name}"`);

  const bodyLines: string[] = [];
  bodyLines.push(greeting(input.tone, lead.contact_name));
  bodyLines.push('');
  bodyLines.push(
    `This is ${senderName}.${tradeShowPhrase} We work with buyers and distributors${marketPhrase} on ${productPhrase}.`.trim(),
  );
  bodyLines.push('');

  if (input.goal === 'send_catalog') {
    bodyLines.push(`I'd like to ${GOAL_LABEL[input.goal]} for ${productPhrase} if that's useful — happy to share pricing once I know your target market and volumes.`);
  } else if (input.goal === 'book_meeting') {
    bodyLines.push(`Would you be open to a short call to see if ${productPhrase} is a fit for your business?`);
  } else if (input.goal === 'follow_up_quote') {
    bodyLines.push('Just checking in on the quote we shared — happy to answer any questions or adjust it based on your feedback.');
  } else {
    bodyLines.push(`Could you share your best pricing and lead time for ${productPhrase}? Let me know if you need more detail on our requirements.`);
  }

  bodyLines.push('');
  bodyLines.push(closing(input.tone, senderName));

  const subject = input.channel === 'email'
    ? `${GOAL_LABEL[input.goal].charAt(0).toUpperCase()}${GOAL_LABEL[input.goal].slice(1)} — ${lead.company_name || lead.contact_name || 'Setu Flow'}`
    : null;

  return {
    leadId: lead.id,
    channel: input.channel,
    goal: input.goal,
    tone: input.tone,
    subject,
    body: bodyLines.join('\n'),
    productsReferenced,
    usedFacts,
  };
}
