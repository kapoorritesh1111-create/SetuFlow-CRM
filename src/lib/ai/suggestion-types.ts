export type SuggestionFamily = 'general' | 'quote' | 'compliance';

export const CANONICAL_SUGGESTION_TYPES = {
  FOLLOW_UP: 'follow_up_assistant',
  INTRO: 'intro_assistant',
  QUOTE_COVER: 'quote_cover_note',
  COMPLIANCE_NEXT_STEP: 'compliance_next_step',
  COMPLIANCE_EVIDENCE: 'compliance_evidence_request',
  INTERNAL_SUMMARY: 'internal_summary',
} as const;

const ALIAS_TO_CANONICAL: Record<string, string> = {
  follow_up_email: CANONICAL_SUGGESTION_TYPES.FOLLOW_UP,
  introduction_email: CANONICAL_SUGGESTION_TYPES.INTRO,
  quote_cover_note: CANONICAL_SUGGESTION_TYPES.QUOTE_COVER,
  compliance_next_step: CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP,
  compliance_evidence_request: CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE,
  internal_summary: CANONICAL_SUGGESTION_TYPES.INTERNAL_SUMMARY,
  follow_up_assistant: CANONICAL_SUGGESTION_TYPES.FOLLOW_UP,
  intro_assistant: CANONICAL_SUGGESTION_TYPES.INTRO,
};

const LABELS: Record<string, string> = {
  [CANONICAL_SUGGESTION_TYPES.FOLLOW_UP]: 'Follow-up Assistant',
  [CANONICAL_SUGGESTION_TYPES.INTRO]: 'Intro Assistant',
  [CANONICAL_SUGGESTION_TYPES.QUOTE_COVER]: 'Quote Cover Note Assistant',
  [CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP]: 'Compliance Next-Step Assistant',
  [CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE]: 'Compliance Evidence Assistant',
  [CANONICAL_SUGGESTION_TYPES.INTERNAL_SUMMARY]: 'Internal Summary',
};

const FAMILIES: Record<string, SuggestionFamily> = {
  [CANONICAL_SUGGESTION_TYPES.FOLLOW_UP]: 'general',
  [CANONICAL_SUGGESTION_TYPES.INTRO]: 'general',
  [CANONICAL_SUGGESTION_TYPES.QUOTE_COVER]: 'quote',
  [CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP]: 'compliance',
  [CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE]: 'compliance',
  [CANONICAL_SUGGESTION_TYPES.INTERNAL_SUMMARY]: 'general',
};

export function normalizeSuggestionType(value: string | null | undefined) {
  const key = String(value ?? '').trim().toLowerCase();
  return ALIAS_TO_CANONICAL[key] ?? key;
}

export function getSuggestionLabel(value: string | null | undefined) {
  const normalized = normalizeSuggestionType(value);
  return LABELS[normalized] ?? normalized.replace(/_/g, ' ');
}

export function getSuggestionFamily(value: string | null | undefined): SuggestionFamily {
  const normalized = normalizeSuggestionType(value);
  return FAMILIES[normalized] ?? 'general';
}

export function getSuggestionFamilyLabel(value: string | null | undefined) {
  const family = getSuggestionFamily(value);
  if (family === 'quote') return 'Quote AI';
  if (family === 'compliance') return 'Compliance AI';
  return 'AI-assisted';
}

export function getSuggestionBadgeClasses(value: string | null | undefined) {
  const family = getSuggestionFamily(value);
  if (family === 'quote') return 'bg-emerald-50 text-emerald-700';
  if (family === 'compliance') return 'bg-amber-50 text-amber-800';
  return 'bg-brand-50 text-brand-800';
}
