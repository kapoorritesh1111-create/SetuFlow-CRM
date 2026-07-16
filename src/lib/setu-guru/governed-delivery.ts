// S48-GROWTH-017: shared "governed delivery" check used by both CRM Matches and External
// Discovery outreach sends. Mirrors the pattern already used for lead communications
// (queueGovernedCommunicationDelivery in src/features/leads/server/actions/legacy-actions.ts):
// look for an active integration row for the channel; if none exists, report an honest
// "not configured" reason rather than pretending the message was delivered.
//
// Live check (2026-07-16): the only active integration provider in this project is
// 'mailtrap' (email, and only for a few organizations). No 'email_outbound' or
// 'whatsapp_outbound' provider is connected for any organization, so this currently
// resolves to "not configured" everywhere — identical to the existing lead-send behavior,
// not a gap introduced by this feature.

export type GovernedChannel = 'email' | 'whatsapp';

export type GovernedDeliveryResult = {
  queued: boolean;
  provider: string;
  reason: string | null;
  target: string | null;
};

export async function checkGovernedDelivery(
  client: any,
  orgId: string,
  channel: GovernedChannel,
  target: string | null | undefined,
): Promise<GovernedDeliveryResult> {
  const provider = channel === 'email' ? 'email_outbound' : 'whatsapp_outbound';
  const cleanTarget = typeof target === 'string' && target.trim() ? target.trim() : null;

  if (!cleanTarget) {
    return { queued: false, provider, reason: `No ${channel === 'email' ? 'email address' : 'phone number'} is on file for this recipient.`, target: null };
  }

  const { data: integration, error } = await client
    .from('integrations')
    .select('id')
    .eq('organization_id', orgId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return { queued: false, provider, reason: error.message, target: cleanTarget };
  if (!integration?.id) {
    return { queued: false, provider, reason: `${provider} is not connected for this organization yet. The message is saved as approved and can be sent manually.`, target: cleanTarget };
  }
  return { queued: true, provider, reason: null, target: cleanTarget };
}
