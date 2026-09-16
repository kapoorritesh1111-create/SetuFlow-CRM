'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { isPackagingOrganization } from '@/lib/verticals/capability';

const RESEND_API = 'https://api.resend.com/emails';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function appOrigin() {
  return String(process.env.NEXT_PUBLIC_APP_URL || 'https://setuflowcrm.com').replace(/\/$/, '');
}

function fromAddress() {
  return String(process.env.RESEND_FROM_EMAIL || process.env.SETU_NOTIFICATION_FROM_EMAIL || '').trim();
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = fromAddress();
  if (!apiKey || !from) return { ok: false, error: 'Customer email delivery is not configured.' };
  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok) return { ok: false, error: payload?.message || payload?.error || `Email provider returned ${response.status}.` };
  return { ok: true, id: payload?.id ?? null };
}

async function context() {
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) throw new Error('Not authenticated.');
  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  if (!(await isPackagingOrganization(organizationId, supabase))) throw new Error('Packaging is not enabled for this workspace.');
  return { workspace, supabase, organizationId, userId: workspace.user.id };
}

export async function sendPackagingQuoteCustomerPackage(input: { leadId: string; quoteId: string }) {
  try {
    const { supabase, organizationId, userId } = await context();
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id,quote_number,status,industry_metadata')
      .eq('organization_id', organizationId)
      .eq('lead_id', input.leadId)
      .eq('id', input.quoteId)
      .maybeSingle();
    if (quoteError) throw new Error(quoteError.message);
    if (!quote?.id) return { ok: false, error: 'Quote was not found.' };

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id,company_name,contact_name,email')
      .eq('organization_id', organizationId)
      .eq('id', input.leadId)
      .maybeSingle();
    if (leadError) throw new Error(leadError.message);
    const email = String(lead?.email || '').trim().toLowerCase();
    if (!email) return { ok: false, error: 'The lead does not have a customer email address.' };

    const existingMeta = quote.industry_metadata ?? {};
    const token = String(existingMeta.customer_review_token || '').trim() || `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    const reviewUrl = `${appOrigin()}/public/quote-review/${token}`;
    const subject = `Stark Packmate quote ${quote.quote_number ?? ''} — review package`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:660px;margin:auto;color:#0f172a"><div style="padding:22px;border:1px solid #e2e8f0;border-radius:18px"><p style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#0f766e;text-transform:uppercase;margin:0 0 8px">Stark Packmate</p><h2 style="margin:0 0 10px">Your packaging quote is ready</h2><p style="color:#475569">Hello ${escapeHtml(lead?.contact_name || lead?.company_name || 'there')},</p><p style="color:#475569">We prepared your quote package in one place. Review the commercial quote, the sample KLD/dieline and the requested product reference before design proceeds.</p><p style="margin:24px 0"><a href="${reviewUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f766e;color:white;text-decoration:none;font-weight:800">Review Quote Package</a></p><p style="font-size:12px;color:#94a3b8">This secure link is for your quote package. No login is required.</p></div></div>`;
    const sent = await sendEmail(email, subject, html);
    if (!sent.ok) return sent;

    const nextMeta = {
      ...existingMeta,
      customer_review_token: token,
      customer_review_sent_at: now,
      customer_review_sent_to: email,
      customer_review_sent_by: userId,
      customer_review_provider_id: sent.id,
    };
    const { error: updateError } = await supabase.from('quotes').update({ industry_metadata: nextMeta }).eq('id', quote.id).eq('organization_id', organizationId);
    if (updateError) throw new Error(updateError.message);

    await supabase.from('communications').insert({
      organization_id: organizationId,
      lead_id: input.leadId,
      related_entity: 'quote',
      related_id: quote.id,
      communication_type: 'quote_message',
      direction: 'outbound',
      channel: 'email',
      subject,
      body: `Customer quote package sent: ${reviewUrl}`,
      summary: 'Quote package sent with quote, sample KLD and product reference.',
      draft_source: 'system',
      status: 'sent',
      sent_at: now,
      created_by: userId,
      provider_payload: sent.id ? { provider_id: sent.id } : {},
      metadata: { customer_review_url: reviewUrl, package_type: 'packaging_quote_review' },
    });

    revalidatePath(`/leads/${input.leadId}/quote`);
    return { ok: true, email, reviewUrl, sentAt: now };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not send customer quote package.' };
  }
}

export async function sendPackagingProofReviewEmail(input: { quoteLineItemId: string; proofId: string }) {
  try {
    const { supabase, organizationId, userId } = await context();
    const { data: proof, error: proofError } = await supabase
      .from('packaging_proofs')
      .select('id,quote_line_item_id,version,approval_token,status')
      .eq('organization_id', organizationId)
      .eq('id', input.proofId)
      .eq('quote_line_item_id', input.quoteLineItemId)
      .maybeSingle();
    if (proofError) throw new Error(proofError.message);
    if (!proof?.id) return { ok: false, error: 'Proof was not found.' };
    if (proof.status === 'approved') return { ok: false, error: 'This proof is already approved.' };

    const { data: line, error: lineError } = await supabase.from('quote_line_items').select('id,quote_id').eq('id', input.quoteLineItemId).maybeSingle();
    if (lineError) throw new Error(lineError.message);
    if (!line?.quote_id) return { ok: false, error: 'Quote line is no longer available.' };
    const { data: quote, error: quoteError } = await supabase.from('quotes').select('id,lead_id,quote_number').eq('id', line.quote_id).eq('organization_id', organizationId).maybeSingle();
    if (quoteError) throw new Error(quoteError.message);
    if (!quote?.lead_id) return { ok: false, error: 'Quote is no longer available.' };
    const { data: lead, error: leadError } = await supabase.from('leads').select('company_name,contact_name,email').eq('id', quote.lead_id).eq('organization_id', organizationId).maybeSingle();
    if (leadError) throw new Error(leadError.message);
    const email = String(lead?.email || '').trim().toLowerCase();
    if (!email) return { ok: false, error: 'The lead does not have a customer email address.' };

    const reviewUrl = `${appOrigin()}/public/proof-approval/${proof.approval_token}`;
    const subject = `Stark Packmate design proof v${proof.version} — approval requested`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:660px;margin:auto;color:#0f172a"><div style="padding:22px;border:1px solid #e2e8f0;border-radius:18px"><p style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#0f766e;text-transform:uppercase;margin:0 0 8px">Stark Packmate</p><h2 style="margin:0 0 10px">Your design proof is ready</h2><p style="color:#475569">Hello ${escapeHtml(lead?.contact_name || lead?.company_name || 'there')},</p><p style="color:#475569">Please review proof v${proof.version}. You can approve it or request changes and add comments from the review page.</p><p style="margin:24px 0"><a href="${reviewUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f766e;color:white;text-decoration:none;font-weight:800">Review Design Proof</a></p><p style="font-size:12px;color:#94a3b8">No login is required. If a newer proof is uploaded, this link will automatically be superseded.</p></div></div>`;
    const sent = await sendEmail(email, subject, html);
    if (!sent.ok) return sent;

    const now = new Date().toISOString();
    await supabase.from('communications').insert({
      organization_id: organizationId,
      lead_id: quote.lead_id,
      related_entity: 'quote',
      related_id: quote.id,
      communication_type: 'quote_message',
      direction: 'outbound',
      channel: 'email',
      subject,
      body: `Design proof v${proof.version} review sent: ${reviewUrl}`,
      summary: `Design proof v${proof.version} sent to customer for approval.`,
      draft_source: 'system',
      status: 'sent',
      sent_at: now,
      created_by: userId,
      provider_payload: sent.id ? { provider_id: sent.id } : {},
      metadata: { proof_id: proof.id, proof_version: proof.version, review_url: reviewUrl },
    });
    return { ok: true, email, reviewUrl, sentAt: now };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not send proof review.' };
  }
}
