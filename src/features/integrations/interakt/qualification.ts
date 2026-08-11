import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';

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
  missingFields: string[];
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

function normalizeText(value: unknown) { return String(value ?? '').trim(); }
function lower(value: unknown) { return normalizeText(value).toLowerCase(); }
function present(value: unknown) { return Boolean(normalizeText(value)); }

function hasCompanyWord(value: string) {
  const normalized = lower(value).replace(/[^a-z0-9]+/g, ' ');
  return COMPANY_WORDS.some((word) => new RegExp(`(^|\\s)${word}(\\s|$)`, 'i').test(normalized));
}

function looksLikeSpacedHandle(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens.length >= 4 && tokens.every((token) => token.replace(/[^A-Za-z]/g, '').length <= 2);
}

function inferIdentity(contact: NormalizedInteraktContact, evidence?: InteraktInquiryEvidence): SetuGuruInteraktAssessment['identity'] {
  const explicitPerson = normalizeText(evidence?.personName);
  const explicitCompany = normalizeText(evidence?.companyName);
  if (explicitPerson || explicitCompany) {
    return {
      kind: explicitCompany && !explicitPerson ? 'company' : 'person',
      personName: explicitPerson || null,
      companyName: explicitCompany || null,
      confidence: 'high',
      reason: 'Identity was confirmed or captured in the inbound qualification record.',
    };
  }

  const name = normalizeText(contact.contactName);
  if (!name) return { kind: 'unclear', personName: null, companyName: null, confidence: 'low', reason: 'Interakt did not provide a usable name.' };
  if (hasCompanyWord(name)) return { kind: 'company', personName: null, companyName: name, confidence: 'high', reason: 'The name contains business terms commonly used in company names.' };
  if (looksLikeSpacedHandle(name)) return { kind: 'unclear', personName: null, companyName: null, confidence: 'low', reason: 'The value looks more like a handle or stylized account name than a clear person or company name.' };
  const words = name.replace(/[^\p{L}\p{M}' -]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 4) return { kind: 'person', personName: name, companyName: null, confidence: 'high', reason: 'The value has a typical multi-word personal-name structure and no company indicators.' };
  if (words.length === 1 && words[0].length >= 3) return { kind: 'person', personName: name, companyName: null, confidence: 'medium', reason: 'The value is likely a first name or personal alias, but no company name is available.' };
  return { kind: 'unclear', personName: null, companyName: null, confidence: 'low', reason: 'Setu Guru does not have enough identity evidence to split person and company safely.' };
}

function stringEvidence(contact: NormalizedInteraktContact) {
  const raw = contact.rawPayload as Record<string, unknown>;
  const traits = contact.traits ?? {};
  return SOURCE_KEYS.flatMap((key) => [raw[key], traits[key]]).map(lower).filter(Boolean);
}

function inferSource(contact: NormalizedInteraktContact, evidence?: InteraktInquiryEvidence): SetuGuruInteraktAssessment['source'] {
  const acquisition = lower(evidence?.acquisitionType);
  const platform = lower(evidence?.adPlatform);
  if (acquisition === 'ctwa') {
    return { kind: 'ctwa', label: platform ? `WhatsApp · CTWA · ${platform === 'instagram' ? 'Instagram' : 'Facebook'}` : 'WhatsApp · CTWA', confidence: 'high', reason: 'Meta Click-to-WhatsApp attribution was captured from the inbound evidence.' };
  }
  if (lower(evidence?.channelSource) === 'instagram') return { kind: 'instagram', label: 'Instagram', confidence: 'high', reason: 'Inbound evidence identifies Instagram as the channel.' };

  const tags = contact.tags.map((tag) => lower(tag));
  const values = stringEvidence(contact);
  if (tags.some((tag) => tag === 'ctwa' || tag.includes('click to whatsapp') || tag.includes('click-to-whatsapp'))) return { kind: 'ctwa', label: 'WhatsApp · CTWA', confidence: 'high', reason: 'Interakt supplied a CTWA tag.' };
  if (values.some((value) => value.includes('instagram'))) return { kind: 'instagram', label: 'Instagram', confidence: 'high', reason: 'The Interakt payload contains an Instagram source/channel value.' };
  if (values.some((value) => value.includes('whatsapp'))) return { kind: 'whatsapp', label: 'WhatsApp', confidence: 'high', reason: 'The Interakt payload contains a WhatsApp source/channel value.' };
  if (contact.fullPhoneNumber && lower(contact.sourceCreatedVia) === 'messagepersister') return { kind: 'whatsapp', label: 'WhatsApp', confidence: 'medium', reason: 'Interakt created the phone contact through its message persistence flow.' };
  return { kind: 'unknown', label: 'Unknown', confidence: 'low', reason: 'The available evidence does not identify the channel safely.' };
}

function recencyPoints(createdAt: string | null, now: Date) {
  if (!createdAt) return { points: 0, reason: null as string | null };
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return { points: 0, reason: null as string | null };
  const hours = Math.max(0, (now.getTime() - created.getTime()) / 3_600_000);
  if (hours <= 24) return { points: 10, reason: 'inquiry/contact within 24 hours' };
  if (hours <= 24 * 7) return { points: 7, reason: 'inquiry/contact within 7 days' };
  if (hours <= 24 * 30) return { points: 3, reason: 'inquiry/contact within 30 days' };
  return { points: 0, reason: null as string | null };
}

function bandForScore(score: number): Pick<SetuGuruInteraktAssessment, 'band' | 'bandLabel' | 'isHotLead' | 'canRecommendQualification'> {
  if (score >= 80) return { band: 'hot', bandLabel: 'Hot lead', isHotLead: true, canRecommendQualification: true };
  if (score >= 70) return { band: 'qualify', bandLabel: 'Ready to qualify', isHotLead: false, canRecommendQualification: true };
  if (score >= 50) return { band: 'warm', bandLabel: 'Warm inquiry', isHotLead: false, canRecommendQualification: false };
  if (score >= 30) return { band: 'inquiry', bandLabel: 'Inquiry · needs qualification', isHotLead: false, canRecommendQualification: false };
  return { band: 'low_signal', bandLabel: 'Low signal', isHotLead: false, canRecommendQualification: false };
}

export function assessInteraktContact(contact: NormalizedInteraktContact, now = new Date(), evidence?: InteraktInquiryEvidence): SetuGuruInteraktAssessment {
  const identity = inferIdentity(contact, evidence);
  const source = inferSource(contact, evidence);
  const scoreParts: string[] = [];
  let score = 0;

  if (source.kind === 'ctwa') { score += 12; scoreParts.push('+12 CTWA acquisition'); }
  else if (source.kind === 'whatsapp') { score += 8; scoreParts.push('+8 WhatsApp inbound'); }
  else if (source.kind === 'instagram') { score += 6; scoreParts.push('+6 Instagram inbound'); }
  else { score += 2; scoreParts.push('+2 source captured'); }

  if (contact.fullPhoneNumber) { score += 8; scoreParts.push('+8 reachable phone'); }
  if (contact.email) { score += 4; scoreParts.push('+4 email'); }
  if (contact.contactName || evidence?.personName) { score += 6; scoreParts.push('+6 named contact'); }
  if (evidence?.companyName) { score += 8; scoreParts.push('+8 company identified'); }

  if (present(evidence?.packagingType)) { score += 8; scoreParts.push('+8 packaging category'); }
  if (present(evidence?.pouchType)) { score += 10; scoreParts.push('+10 specific pouch type'); }
  if (present(evidence?.quantityText)) { score += 12; scoreParts.push('+12 quantity/MOQ'); }
  if (present(evidence?.dimensionsPrint)) { score += 8; scoreParts.push('+8 dimensions/print'); }
  if (present(evidence?.deliveryLocation)) { score += 7; scoreParts.push('+7 delivery location'); }
  if (present(evidence?.buyingTimeline)) { score += 9; scoreParts.push('+9 buying timeline'); }
  if (present(evidence?.industry) && lower(evidence?.industry) !== 'na' && lower(evidence?.industry) !== 'n/a') { score += 4; scoreParts.push('+4 industry'); }

  const inboundTexts = evidence?.inboundMessageTexts ?? [];
  const joinedMessages = inboundTexts.join(' ').toLowerCase();
  if (/quote|quotation|price|pricing|cost|sample|order|buy|need|require/.test(joinedMessages)) { score += 8; scoreParts.push('+8 commercial intent in message'); }
  if ((evidence?.workflowAnswerCount ?? 0) > 0) { score += 4; scoreParts.push('+4 chatbot engagement'); }

  const recency = recencyPoints(evidence?.firstInquiryAt ?? contact.sourceCreatedAt, now);
  score += recency.points;
  if (recency.reason) scoreParts.push(`+${recency.points} ${recency.reason}`);

  const hasIntentEvidence = inboundTexts.length > 0 || (evidence?.workflowAnswerCount ?? 0) > 0 || present(evidence?.packagingType) || present(evidence?.pouchType) || present(evidence?.quantityText);
  const finalScore = Math.min(hasIntentEvidence ? score : Math.min(score, 69), 100);
  const band = bandForScore(finalScore);
  const missingFields = [
    !present(evidence?.companyName) ? 'Company' : null,
    !(present(evidence?.packagingType) || present(evidence?.pouchType)) ? 'Product / pouch type' : null,
    !present(evidence?.quantityText) ? 'Quantity / MOQ' : null,
    !present(evidence?.dimensionsPrint) ? 'Dimensions / print' : null,
    !present(evidence?.deliveryLocation) ? 'Delivery location' : null,
    !present(evidence?.buyingTimeline) ? 'Buying timeline' : null,
  ].filter(Boolean) as string[];

  const inquiryReceivedAt = evidence?.firstInquiryAt ?? null;
  const nextStep = missingFields.length
    ? `Ask only for the missing qualification details: ${missingFields.join(', ')}.`
    : finalScore >= 70
      ? 'Qualification evidence is complete enough for a salesperson to promote this inquiry into the Lead pipeline.'
      : 'Review the conversation for stronger commercial intent before promotion.';

  return {
    identity,
    source,
    contactCreatedAt: contact.sourceCreatedAt,
    inquiryReceivedAt,
    inquiryTimingLabel: inquiryReceivedAt ? 'Exact inbound timestamp captured from Interakt.' : 'Exact inquiry time not captured yet.',
    score: finalScore,
    ...band,
    scoreReason: scoreParts.join(' · '),
    nextStep,
    missingFields,
  };
}
