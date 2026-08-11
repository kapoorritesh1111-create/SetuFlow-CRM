import type { NormalizedInteraktContact } from '@/features/integrations/interakt/types';

export type InteraktIdentityKind = 'person' | 'company' | 'unclear';
export type InteraktSourceKind = 'ctwa' | 'whatsapp' | 'instagram' | 'unknown';
export type InteraktQualificationBand = 'hot' | 'qualify' | 'warm' | 'inquiry' | 'low_signal';

export type SetuGuruInteraktAssessment = {
  identity: {
    kind: InteraktIdentityKind;
    personName: string | null;
    companyName: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  source: {
    kind: InteraktSourceKind;
    label: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  contactCreatedAt: string | null;
  inquiryReceivedAt: string | null;
  inquiryTimingLabel: string;
  score: number;
  band: InteraktQualificationBand;
  bandLabel: string;
  isHotLead: boolean;
  canRecommendQualification: boolean;
  scoreReason: string;
  nextStep: string;
};

const COMPANY_WORDS = [
  'agro', 'equipment', 'equipments', 'packaging', 'packmate', 'enterprise', 'enterprises',
  'industry', 'industries', 'trading', 'traders', 'export', 'exports', 'import', 'imports',
  'foods', 'food', 'solutions', 'systems', 'technologies', 'technology', 'polymers', 'plastics',
  'machinery', 'manufacturer', 'manufacturers', 'associates', 'agency', 'agencies', 'group',
  'mart', 'store', 'stores', 'services', 'pvt', 'private', 'limited', 'ltd', 'llp', 'inc', 'llc',
  'corp', 'corporation', 'company', 'co', 'international', 'global', 'ventures', 'products',
];

const SOURCE_KEYS = [
  'source', 'channel', 'channel_type', 'platform', 'entry_source', 'lead_source', 'source_type',
  'campaign_source', 'utm_source', 'customer_created_at_source',
];

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function lower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function hasCompanyWord(value: string) {
  const normalized = lower(value).replace(/[^a-z0-9]+/g, ' ');
  return COMPANY_WORDS.some((word) => new RegExp(`(^|\\s)${word}(\\s|$)`, 'i').test(normalized));
}

function looksLikeSpacedHandle(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens.length >= 4 && tokens.every((token) => token.replace(/[^A-Za-z]/g, '').length <= 2);
}

function inferIdentity(contact: NormalizedInteraktContact): SetuGuruInteraktAssessment['identity'] {
  const name = normalizeText(contact.contactName);
  if (!name) {
    return {
      kind: 'unclear',
      personName: null,
      companyName: null,
      confidence: 'low',
      reason: 'Interakt did not provide a usable name.',
    };
  }

  if (hasCompanyWord(name)) {
    return {
      kind: 'company',
      personName: null,
      companyName: name,
      confidence: 'high',
      reason: 'The name contains business terms commonly used in company names.',
    };
  }

  if (looksLikeSpacedHandle(name)) {
    return {
      kind: 'unclear',
      personName: null,
      companyName: null,
      confidence: 'low',
      reason: 'The value looks more like a handle or stylized account name than a clear person or company name.',
    };
  }

  const words = name.replace(/[^\p{L}\p{M}' -]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 4) {
    return {
      kind: 'person',
      personName: name,
      companyName: null,
      confidence: 'high',
      reason: 'The value has a typical multi-word personal-name structure and no company indicators.',
    };
  }

  if (words.length === 1 && words[0].length >= 3) {
    return {
      kind: 'person',
      personName: name,
      companyName: null,
      confidence: 'medium',
      reason: 'The value is likely a first name or personal alias, but no company name is available.',
    };
  }

  return {
    kind: 'unclear',
    personName: null,
    companyName: null,
    confidence: 'low',
    reason: 'Setu Guru does not have enough identity evidence to split person and company safely.',
  };
}

function stringEvidence(contact: NormalizedInteraktContact) {
  const raw = contact.rawPayload as Record<string, unknown>;
  const traits = contact.traits ?? {};
  return SOURCE_KEYS.flatMap((key) => [raw[key], traits[key]])
    .map(lower)
    .filter(Boolean);
}

function inferSource(contact: NormalizedInteraktContact): SetuGuruInteraktAssessment['source'] {
  const tags = contact.tags.map((tag) => lower(tag));
  const evidence = stringEvidence(contact);

  if (tags.some((tag) => tag === 'ctwa' || tag.includes('click to whatsapp') || tag.includes('click-to-whatsapp'))) {
    return {
      kind: 'ctwa',
      label: 'WhatsApp · CTWA',
      confidence: 'high',
      reason: 'Interakt supplied a CTWA tag, indicating a Click-to-WhatsApp acquisition path.',
    };
  }

  if (evidence.some((value) => value.includes('instagram'))) {
    return {
      kind: 'instagram',
      label: 'Instagram',
      confidence: 'high',
      reason: 'The Interakt payload contains an Instagram source/channel value.',
    };
  }

  if (evidence.some((value) => value.includes('whatsapp'))) {
    return {
      kind: 'whatsapp',
      label: 'WhatsApp',
      confidence: 'high',
      reason: 'The Interakt payload contains a WhatsApp source/channel value.',
    };
  }

  if (contact.fullPhoneNumber && lower(contact.sourceCreatedVia) === 'messagepersister') {
    return {
      kind: 'whatsapp',
      label: 'Likely WhatsApp',
      confidence: 'medium',
      reason: 'The contact has a WhatsApp-style phone identity and was created through Interakt MessagePersister; the API did not expose the user-facing channel directly.',
    };
  }

  return {
    kind: 'unknown',
    label: 'Unknown',
    confidence: 'low',
    reason: 'The Contacts API did not provide enough channel evidence to label this as WhatsApp or Instagram safely.',
  };
}

function recencyPoints(createdAt: string | null, now: Date) {
  if (!createdAt) return { points: 0, reason: null as string | null };
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return { points: 0, reason: null as string | null };
  const hours = Math.max(0, (now.getTime() - created.getTime()) / 3_600_000);
  if (hours <= 24) return { points: 15, reason: 'created within 24 hours' };
  if (hours <= 24 * 7) return { points: 10, reason: 'created within 7 days' };
  if (hours <= 24 * 30) return { points: 5, reason: 'created within 30 days' };
  return { points: 0, reason: null as string | null };
}

function bandForScore(score: number): Pick<SetuGuruInteraktAssessment, 'band' | 'bandLabel' | 'isHotLead' | 'canRecommendQualification'> {
  if (score >= 80) return { band: 'hot', bandLabel: 'Hot lead', isHotLead: true, canRecommendQualification: true };
  if (score >= 70) return { band: 'qualify', bandLabel: 'Recommend qualify', isHotLead: false, canRecommendQualification: true };
  if (score >= 50) return { band: 'warm', bandLabel: 'Warm inquiry', isHotLead: false, canRecommendQualification: false };
  if (score >= 30) return { band: 'inquiry', bandLabel: 'Inquiry · needs qualification', isHotLead: false, canRecommendQualification: false };
  return { band: 'low_signal', bandLabel: 'Low signal', isHotLead: false, canRecommendQualification: false };
}

export function assessInteraktContact(contact: NormalizedInteraktContact, now = new Date()): SetuGuruInteraktAssessment {
  const identity = inferIdentity(contact);
  const source = inferSource(contact);
  const scoreParts: string[] = [];
  let score = 0;

  if (source.kind === 'ctwa') { score += 18; scoreParts.push('+18 CTWA intent source'); }
  else if (source.kind === 'whatsapp') { score += 12; scoreParts.push('+12 WhatsApp source'); }
  else if (source.kind === 'instagram') { score += 8; scoreParts.push('+8 Instagram source'); }
  else { score += 2; scoreParts.push('+2 source captured'); }

  if (contact.fullPhoneNumber) { score += 12; scoreParts.push('+12 reachable phone'); }
  if (contact.email) { score += 6; scoreParts.push('+6 email available'); }
  if (contact.whatsappOptedIn === true) { score += 8; scoreParts.push('+8 WhatsApp opt-in'); }
  if (contact.contactName) { score += 8; scoreParts.push('+8 named contact'); }

  if (identity.kind === 'company') { score += 10; scoreParts.push('+10 company signal'); }
  else if (identity.kind === 'person') { score += 6; scoreParts.push('+6 person identified'); }
  else { score += 2; scoreParts.push('+2 identity captured but unclear'); }

  if (contact.tags.length > 0 && source.kind !== 'ctwa') { score += 4; scoreParts.push('+4 Interakt tags'); }

  const recency = recencyPoints(contact.sourceCreatedAt, now);
  score += recency.points;
  if (recency.reason) scoreParts.push(`+${recency.points} ${recency.reason}`);

  // Contact retrieval contains acquisition/contact evidence, not the actual buyer message.
  // Do not label a person Hot or Recommend Qualify until intent evidence arrives.
  const contactOnlyScore = Math.min(score, 69);
  const band = bandForScore(contactOnlyScore);

  return {
    identity,
    source,
    contactCreatedAt: contact.sourceCreatedAt,
    inquiryReceivedAt: null,
    inquiryTimingLabel: 'Exact inquiry time not captured yet · requires incoming message webhook',
    score: contactOnlyScore,
    ...band,
    scoreReason: scoreParts.join(' · '),
    nextStep: contactOnlyScore >= 50
      ? 'Priority review: confirm company, product requirement, quantity/MOQ, destination and buying timeline.'
      : 'Ask qualification questions before promoting this contact into the lead pipeline.',
  };
}
