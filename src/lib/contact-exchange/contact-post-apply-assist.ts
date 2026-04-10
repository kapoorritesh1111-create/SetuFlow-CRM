import type { ContactSourceProfile } from '@/lib/contact-exchange/contact-parser';

export type ContactPostApplyAssistDraft = {
  currentLeadId?: string | null;
  companyName: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  website: string;
  notes: string;
  sourceType?: string | null;
  sourceLabel?: string | null;
  sourceProfile?: ContactSourceProfile | null;
};

export type ContactAssistLeadCandidate = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  website: string | null;
  next_follow_up_at: string | null;
};

export type ContactPostApplyMatch = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  nextFollowUpAt: string;
  score: number;
  normalizedScore: number;
  strength: 'strong' | 'medium';
  rankingLabel: 'Highest confidence' | 'Review next' | 'Possible but weaker';
  primaryReason: string;
  recommendedAction: string;
  actionItems: string[];
  reasons: string[];
};

export type ContactWorkflowHandoffSuggestion = {
  id: string;
  title: string;
  detail: string;
  readiness: 'ready_now' | 'needs_confirmation';
  timing: string;
  recommendedOwner: string;
  reason: string;
};

export type ContactPostApplyAssistResult = {
  lookupMode: 'live' | 'heuristic';
  summary: string;
  saveReadyReview: string;
  duplicateMatches: ContactPostApplyMatch[];
  operatorChecklist: string[];
  followUpPrompts: string[];
  workflowHandoffSuggestions: ContactWorkflowHandoffSuggestion[];
  guardrails: string[];
};

type CandidateSignalBundle = {
  exactEmailMatch: boolean;
  exactPhoneMatch: boolean;
  secondaryPhoneMatch: boolean;
  exactCompanyMatch: boolean;
  exactContactMatch: boolean;
  websiteDomainMatch: boolean;
  emailDomainMatch: boolean;
  companySimilarityScore: number;
  contactSimilarityScore: number;
};

const LEGAL_SUFFIXES = new Set(['inc', 'inc.', 'llc', 'l.l.c', 'ltd', 'ltd.', 'limited', 'co', 'co.', 'company', 'corp', 'corp.', 'corporation', 'pvt', 'pvt.', 'private']);

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeHost(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  const withoutProtocol = raw.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return withoutProtocol.split('/')[0] ?? '';
}

function normalizeEmailDomain(value: string | null | undefined) {
  const email = normalizeText(value);
  if (!email.includes('@')) return '';
  return email.split('@')[1] ?? '';
}

function normalizeCompanyComparable(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !LEGAL_SUFFIXES.has(token))
    .join(' ');
}

function tokenizeComparable(value: string | null | undefined) {
  return normalizeCompanyComparable(value)
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function overlapSimilarity(left: string | null | undefined, right: string | null | undefined) {
  const leftTokens = unique(tokenizeComparable(left));
  const rightTokens = unique(tokenizeComparable(right));
  if (!leftTokens.length || !rightTokens.length) return 0;

  const rightSet = new Set(rightTokens);
  const overlap = leftTokens.filter((token) => rightSet.has(token)).length;
  const coverage = overlap / Math.max(leftTokens.length, rightTokens.length);
  const containment = overlap / Math.min(leftTokens.length, rightTokens.length);
  return Number(((coverage * 0.55) + (containment * 0.45)).toFixed(2));
}

function cleanPromptValue(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function scoreSignals(signals: CandidateSignalBundle) {
  let score = 0;
  const reasons: string[] = [];

  if (signals.exactEmailMatch) {
    score += 120;
    reasons.push('Exact email match');
  }
  if (signals.exactPhoneMatch) {
    score += 105;
    reasons.push('Exact phone match');
  }
  if (signals.secondaryPhoneMatch) {
    score += 72;
    reasons.push('Secondary phone match');
  }
  if (signals.exactCompanyMatch) {
    score += 34;
    reasons.push('Exact company name match');
  }
  if (signals.exactContactMatch) {
    score += 24;
    reasons.push('Contact name match');
  }
  if (signals.websiteDomainMatch) {
    score += 18;
    reasons.push('Website domain match');
  }
  if (signals.emailDomainMatch) {
    score += 16;
    reasons.push('Email domain match');
  }
  if (!signals.exactCompanyMatch && signals.companySimilarityScore >= 0.55) {
    score += 18;
    reasons.push('Company similarity');
  }
  if (!signals.exactContactMatch && signals.contactSimilarityScore >= 0.6) {
    score += 14;
    reasons.push('Contact similarity');
  }

  return { score, reasons };
}

function inferPrimaryReason(reasons: string[]) {
  return reasons[0] ?? 'Similarity signal';
}

function inferRecommendedAction(signals: CandidateSignalBundle, strength: 'strong' | 'medium') {
  if (signals.exactEmailMatch || signals.exactPhoneMatch) {
    return 'Open the likely existing lead before final save and confirm whether this scan should update that record instead of creating a net-new lead.';
  }
  if (signals.exactCompanyMatch && signals.exactContactMatch) {
    return 'Review this existing lead next. Company and contact look aligned enough that creating a second lead may create avoidable duplication.';
  }
  if (strength === 'strong') {
    return 'Review this lead before saving. The combined signals are strong enough to treat it as a likely match until proven otherwise.';
  }
  return 'Treat this as a possible match only. Keep the final save manual and verify directly before deciding to reuse or create a new lead.';
}

function inferActionItems(match: { reasons: string[]; email: string; phone: string; website: string; nextFollowUpAt: string }) {
  const items = ['Compare the reviewed scan values against this existing lead before the final save.'];

  if (match.reasons.includes('Exact email match')) items.push('Check whether the email already belongs to an active buying contact in CRM.');
  if (match.reasons.includes('Exact phone match') || match.reasons.includes('Secondary phone match')) items.push('Confirm whether the phone number maps to the same person or a shared office line.');
  if (match.reasons.includes('Website domain match') || match.reasons.includes('Email domain match')) items.push('Verify whether the domain indicates the same account or only the same company umbrella.');
  if (match.nextFollowUpAt) items.push(`There is already a follow-up on record at ${match.nextFollowUpAt}. Keep outreach aligned before creating another lead.`);

  return unique(items).slice(0, 3);
}

function scoreCandidate(draft: ContactPostApplyAssistDraft, candidate: ContactAssistLeadCandidate): ContactPostApplyMatch | null {
  if (draft.currentLeadId && candidate.id === draft.currentLeadId) return null;

  const draftEmail = normalizeText(draft.email);
  const candidateEmail = normalizeText(candidate.email);
  const draftPhone = normalizePhone(draft.phone);
  const draftPhoneSecondary = normalizePhone(draft.phoneSecondary);
  const candidatePhone = normalizePhone(candidate.phone);
  const candidatePhoneSecondary = normalizePhone(candidate.phone_secondary);
  const draftCompany = normalizeCompanyComparable(draft.companyName);
  const candidateCompany = normalizeCompanyComparable(candidate.company_name);
  const draftContact = normalizeCompanyComparable(draft.contactName);
  const candidateContact = normalizeCompanyComparable(candidate.contact_name);
  const draftHost = normalizeHost(draft.website);
  const candidateHost = normalizeHost(candidate.website);
  const draftEmailDomain = normalizeEmailDomain(draft.email);
  const candidateEmailDomain = normalizeEmailDomain(candidate.email);

  const signals: CandidateSignalBundle = {
    exactEmailMatch: Boolean(draftEmail && candidateEmail && draftEmail === candidateEmail),
    exactPhoneMatch: Boolean(
      (draftPhone && candidatePhone && draftPhone === candidatePhone) ||
      (draftPhone && candidatePhoneSecondary && draftPhone === candidatePhoneSecondary) ||
      (draftPhoneSecondary && candidatePhone && draftPhoneSecondary === candidatePhone) ||
      (draftPhoneSecondary && candidatePhoneSecondary && draftPhoneSecondary === candidatePhoneSecondary)
    ),
    secondaryPhoneMatch: Boolean(
      (draftPhone && candidatePhoneSecondary && draftPhone === candidatePhoneSecondary) ||
      (draftPhoneSecondary && candidatePhone && draftPhoneSecondary === candidatePhone)
    ),
    exactCompanyMatch: Boolean(draftCompany && candidateCompany && draftCompany === candidateCompany),
    exactContactMatch: Boolean(draftContact && candidateContact && draftContact === candidateContact),
    websiteDomainMatch: Boolean(draftHost && candidateHost && draftHost === candidateHost),
    emailDomainMatch: Boolean(draftEmailDomain && candidateEmailDomain && draftEmailDomain === candidateEmailDomain),
    companySimilarityScore: overlapSimilarity(draft.companyName, candidate.company_name),
    contactSimilarityScore: overlapSimilarity(draft.contactName, candidate.contact_name),
  };

  const scored = scoreSignals(signals);
  const exactDuplicate = signals.exactEmailMatch || signals.exactPhoneMatch;
  const enoughSimilarity = scored.score >= 45 || signals.companySimilarityScore >= 0.78 || signals.contactSimilarityScore >= 0.82;
  if (!exactDuplicate && !enoughSimilarity) return null;

  const normalizedScore = Math.max(44, Math.min(99, Math.round(scored.score / 2.15 + ((signals.companySimilarityScore + signals.contactSimilarityScore) * 12))));
  const strength: ContactPostApplyMatch['strength'] = exactDuplicate || normalizedScore >= 78 ? 'strong' : 'medium';
  const reasons = unique(scored.reasons);
  const primaryReason = inferPrimaryReason(reasons);
  const match: ContactPostApplyMatch = {
    id: candidate.id,
    companyName: cleanPromptValue(candidate.company_name),
    contactName: cleanPromptValue(candidate.contact_name ?? ''),
    email: cleanPromptValue(candidate.email ?? ''),
    phone: cleanPromptValue(candidate.phone ?? candidate.phone_secondary ?? ''),
    website: cleanPromptValue(candidate.website ?? ''),
    nextFollowUpAt: cleanPromptValue(candidate.next_follow_up_at ?? ''),
    score: scored.score,
    normalizedScore,
    strength,
    rankingLabel: 'Possible but weaker',
    primaryReason,
    recommendedAction: inferRecommendedAction(signals, strength),
    actionItems: [],
    reasons,
  };
  match.actionItems = inferActionItems(match);
  return match;
}

function decorateMatches(matches: ContactPostApplyMatch[]): ContactPostApplyMatch[] {
  return matches.map((match, index) => {
    const rankingLabel: ContactPostApplyMatch['rankingLabel'] = index === 0 ? 'Highest confidence' : index === 1 ? 'Review next' : 'Possible but weaker';
    return {
      ...match,
      rankingLabel,
    };
  });
}

function buildFollowUpPrompts(draft: ContactPostApplyAssistDraft, matches: ContactPostApplyMatch[]) {
  const prompts: string[] = [];
  const strongMatches = matches.filter((match) => match.strength === 'strong');

  if (strongMatches.length) {
    prompts.push('Before final save, decide whether this scan should update an existing lead instead of creating a duplicate.');
  }

  if (draft.email || draft.phone || draft.phoneSecondary) {
    prompts.push('Keep the final save manual, then schedule a 24-hour follow-up so the captured contact stays warm.');
  } else {
    prompts.push('Keep the save guarded until at least one direct contact method is verified on the lead.');
  }

  if (draft.sourceProfile === 'business_card') {
    prompts.push('Use the first follow-up to confirm buying scope, website, or LinkedIn if the business card only gave partial context.');
  } else if (draft.sourceProfile === 'screenshot') {
    prompts.push('Use the first follow-up to verify the sender identity and context when the source is a screenshot or signature block.');
  } else if (draft.sourceProfile === 'scan_pdf') {
    prompts.push('Use the first follow-up to confirm the primary decision-maker if the scan-PDF contained multiple names or departments.');
  }

  if (draft.jobTitle && /procurement|purchase|buyer|sourcing|sales|director|manager/i.test(draft.jobTitle)) {
    prompts.push('Tailor the next follow-up around the detected role so the first outreach feels specific, not generic.');
  }

  return unique(prompts);
}


function buildSaveReadyReview(draft: ContactPostApplyAssistDraft, matches: ContactPostApplyMatch[]) {
  const strongMatches = matches.filter((match) => match.strength === 'strong');
  if (strongMatches.length) {
    return 'Save-ready review: a likely existing CRM record surfaced. Resolve the strongest duplicate suggestion before choosing net-new save.';
  }
  if (draft.email || draft.phone || draft.phoneSecondary) {
    return 'Save-ready review: this scan has enough direct contact detail to continue through the normal manual save once the operator confirms the values.';
  }
  return 'Save-ready review: keep the final save manual, but verify at least one direct contact method before treating the record as outreach-ready.';
}

function buildWorkflowHandoffSuggestions(draft: ContactPostApplyAssistDraft, matches: ContactPostApplyMatch[]): ContactWorkflowHandoffSuggestion[] {
  const suggestions: ContactWorkflowHandoffSuggestion[] = [];
  const topMatch = matches[0] ?? null;
  const strongMatch = matches.find((match) => match.strength === 'strong') ?? null;
  const hasDirectContactMethod = Boolean(draft.email || draft.phone || draft.phoneSecondary);
  const hasDomainSignal = Boolean(normalizeHost(draft.website) || normalizeEmailDomain(draft.email));

  if (strongMatch) {
    suggestions.push({
      id: 'existing-record-review',
      title: 'Existing record review before save',
      detail: 'Open the highest-confidence CRM match and decide whether this scan should continue on that record before creating a net-new lead.',
      readiness: 'needs_confirmation',
      timing: 'Before final save',
      recommendedOwner: 'Lead operator or current record owner',
      reason: strongMatch.primaryReason,
    });
  } else {
    suggestions.push({
      id: 'net-new-save-handoff',
      title: 'Net-new lead handoff',
      detail: 'No strong duplicate signal surfaced. Continue with the normal manual save, then route the lead into the standard ownership and follow-up workflow.',
      readiness: 'ready_now',
      timing: 'Immediately after save',
      recommendedOwner: 'Lead owner or SDR',
      reason: 'No strong duplicate signal detected after apply',
    });
  }

  suggestions.push({
    id: hasDirectContactMethod ? 'first-outreach' : 'contact-verification',
    title: hasDirectContactMethod ? 'First outreach handoff' : 'Contact verification handoff',
    detail: hasDirectContactMethod
      ? 'After the manual save, hand this record into the first-outreach queue with a 24-hour response target so the captured contact stays warm.'
      : 'After the manual save, hand this record into a verification step first so email or phone can be confirmed before live outreach starts.',
    readiness: hasDirectContactMethod ? 'ready_now' : 'needs_confirmation',
    timing: hasDirectContactMethod ? 'Within 24 hours after save' : 'Before outreach begins',
    recommendedOwner: hasDirectContactMethod ? 'Assigned rep or SDR' : 'Lead operator or research support',
    reason: hasDirectContactMethod ? 'Direct contact detail is already present in the reviewed scan' : 'Direct outreach data is still incomplete',
  });

  if (hasDomainSignal) {
    suggestions.push({
      id: 'account-context',
      title: 'Account context handoff',
      detail: 'Use the website or email domain to align the saved lead with the correct account context, territory, or existing buying group after the save decision is made.',
      readiness: 'ready_now',
      timing: 'Right after save or duplicate resolution',
      recommendedOwner: 'Account owner or lead operator',
      reason: 'Website or domain signal is available for account routing',
    });
  } else if (draft.sourceProfile === 'scan_pdf' || draft.sourceProfile === 'screenshot' || draft.sourceProfile === 'business_card') {
    suggestions.push({
      id: 'context-enrichment',
      title: 'Context enrichment handoff',
      detail: 'Use the first follow-up or research pass to confirm website, team context, and decision scope so the saved lead enters workflow with better routing context.',
      readiness: 'needs_confirmation',
      timing: 'After save, before deeper qualification',
      recommendedOwner: 'Assigned rep or research support',
      reason: 'Source-specific scan context is present but account routing detail is still thin',
    });
  }

  return suggestions.slice(0, 3);
}

function buildOperatorChecklist(matches: ContactPostApplyMatch[]) {
  const items = [
    'Keep the final save manual after reviewing the assist card.',
    'Decide explicitly whether this should stay net-new or be handled as an existing CRM contact.',
  ];

  if (matches.some((match) => match.reasons.includes('Exact email match'))) {
    items.push('Email is the strongest duplicate indicator in this batch. Check it first.');
  }
  if (matches.some((match) => match.reasons.includes('Exact phone match') || match.reasons.includes('Secondary phone match'))) {
    items.push('Phone matches can be shared lines. Verify person identity before treating them as the same contact.');
  }
  if (matches.some((match) => match.reasons.includes('Website domain match') || match.reasons.includes('Email domain match'))) {
    items.push('Shared domains can still represent different subsidiaries or teams. Confirm account ownership before reuse.');
  }

  return unique(items);
}

export function buildContactPostApplyAssist(args: {
  draft: ContactPostApplyAssistDraft;
  candidates?: ContactAssistLeadCandidate[];
  lookupMode?: ContactPostApplyAssistResult['lookupMode'];
}): ContactPostApplyAssistResult {
  const draft = args.draft;
  const candidates = args.candidates ?? [];
  const duplicateMatches = decorateMatches(
    candidates
      .map((candidate) => scoreCandidate(draft, candidate))
      .filter((match): match is ContactPostApplyMatch => Boolean(match))
      .sort((left, right) => right.normalizedScore - left.normalizedScore || right.score - left.score)
      .slice(0, 3)
  );

  const followUpPrompts = buildFollowUpPrompts(draft, duplicateMatches);
  const operatorChecklist = buildOperatorChecklist(duplicateMatches);
  const workflowHandoffSuggestions = buildWorkflowHandoffSuggestions(draft, duplicateMatches);
  const saveReadyReview = buildSaveReadyReview(draft, duplicateMatches);
  const guardrails = [
    'Post-apply assist is advisory only. Final save stays manual.',
    'Duplicate hints do not auto-merge or auto-update any CRM record.',
    'Workflow handoff suggestions stay lightweight until the operator completes the manual save decision.',
    'Apply reviewed scan values first, then decide whether to save as net-new or update an existing lead.',
  ];

  const summary = duplicateMatches.length
    ? `${duplicateMatches.length} ranked CRM match${duplicateMatches.length === 1 ? '' : 'es'} found after apply. Review the highest-confidence suggestion first before the final save.`
    : 'No close CRM match found after apply. Final save stays manual, and lightweight workflow handoff suggestions are provided below.';

  return {
    lookupMode: args.lookupMode ?? 'heuristic',
    summary,
    saveReadyReview,
    duplicateMatches,
    operatorChecklist,
    followUpPrompts,
    workflowHandoffSuggestions,
    guardrails,
  };
}
