type DbClient = any;

type ProfileSignatureInput = {
  userId: string;
  organizationId: string;
  fallbackName?: string | null;
  fallbackEmail?: string | null;
  fallbackOrganizationName?: string | null;
};

export type ProfileSignature = {
  fullName: string;
  phoneNumber: string;
  emailAddress: string;
  organizationName: string;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function loadRequiredProfileSignature(db: DbClient, input: ProfileSignatureInput): Promise<ProfileSignature> {
  const [{ data: profile }, { data: organization }, { data: cardForOrg }] = await Promise.all([
    db.from('profiles').select('full_name,email').eq('id', input.userId).maybeSingle(),
    db.from('organizations').select('name,contact_email,contact_phone,whatsapp_phone').eq('id', input.organizationId).maybeSingle(),
    db.from('my_card_settings').select('primary_phone,secondary_phone').eq('user_id', input.userId).eq('organization_id', input.organizationId).limit(1).maybeSingle(),
  ]);

  let card = cardForOrg;
  if (!card?.primary_phone && !card?.secondary_phone) {
    const { data: fallbackCard } = await db
      .from('my_card_settings')
      .select('primary_phone,secondary_phone')
      .eq('user_id', input.userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    card = fallbackCard;
  }

  return {
    fullName: firstText(profile?.full_name, input.fallbackName, profile?.email, input.fallbackEmail, 'Setu Flow user'),
    phoneNumber: firstText(card?.primary_phone, card?.secondary_phone, organization?.whatsapp_phone, organization?.contact_phone),
    emailAddress: firstText(profile?.email, input.fallbackEmail, organization?.contact_email),
    organizationName: firstText(organization?.name, input.fallbackOrganizationName, 'Setu Flow'),
  };
}

export function profileSignatureText(signature: ProfileSignature) {
  return [
    signature.fullName,
    signature.phoneNumber ? `Phone: ${signature.phoneNumber}` : '',
    signature.emailAddress ? `Email: ${signature.emailAddress}` : '',
    signature.organizationName,
  ].filter(Boolean).join('\n');
}

export function profileSignatureHtml(signature: ProfileSignature) {
  const lines = [
    `<strong>${escapeHtml(signature.fullName)}</strong>`,
    signature.phoneNumber ? `Phone: ${escapeHtml(signature.phoneNumber)}` : '',
    signature.emailAddress ? `Email: ${escapeHtml(signature.emailAddress)}` : '',
    escapeHtml(signature.organizationName),
  ].filter(Boolean);
  return lines.join('<br>');
}

export function appendProfileSignatureText(message: string, signature: ProfileSignature) {
  const body = clean(message);
  const footer = profileSignatureText(signature);
  if (!footer) return body;
  return body ? `${body}\n\n${footer}` : footer;
}
