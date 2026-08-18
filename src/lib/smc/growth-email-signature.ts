export const SETU_FLOW_MARKETING_SITE = 'https://www.setuflowcrm.com';

export type GrowthSenderIdentity = {
  name: string;
  email: string;
  phone: string;
  marketingSite: string;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function getGrowthSenderIdentity(supabase: any, user: any): Promise<GrowthSenderIdentity> {
  const [{ data: profile }, { data: card }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name,email')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('my_card_settings')
      .select('primary_phone')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const name = text(profile?.full_name)
    || text(user?.user_metadata?.full_name)
    || text(user?.user_metadata?.name);
  const email = text(profile?.email) || text(user?.email);
  const phone = text(card?.primary_phone) || text(user?.phone);

  return {
    name,
    email,
    phone,
    marketingSite: SETU_FLOW_MARKETING_SITE,
  };
}

export function missingGrowthSenderFields(identity: GrowthSenderIdentity) {
  const missing: string[] = [];
  if (!identity.name) missing.push('name');
  if (!identity.email) missing.push('email');
  if (!identity.phone) missing.push('phone number');
  return missing;
}

export function formatGrowthEmailSignature(identity: GrowthSenderIdentity) {
  return [
    'Best regards,',
    identity.name,
    'SETU Flow CRM',
    `Email: ${identity.email}`,
    `Phone: ${identity.phone}`,
    identity.marketingSite,
  ].join('\n');
}

function signatureStart(message: string) {
  const lower = message.toLowerCase();
  const markers = ['\nbest regards,', '\nkind regards,', '\nwarm regards,', '\nregards,'];
  let found = -1;
  for (const marker of markers) {
    const index = lower.lastIndexOf(marker);
    if (index > found) found = index;
  }
  return found;
}

/**
 * Canonicalize the visible signature so generated drafts and final sends always use
 * the authenticated SMC user's current My Card identity. This also prevents stale
 * or manually edited signatures from being delivered.
 */
export function applyGrowthEmailSignature(message: string, identity: GrowthSenderIdentity) {
  const trimmed = message.trim();
  const start = signatureStart(trimmed);
  const body = start >= 0 ? trimmed.slice(0, start).trimEnd() : trimmed;
  return `${body}\n\n${formatGrowthEmailSignature(identity)}`.trim();
}
