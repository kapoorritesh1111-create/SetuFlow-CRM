import { PRODUCT_ROUTES } from '@/lib/product-contract';
import type { ContactPostApplyAssistResult } from '@/lib/contact-exchange/contact-post-apply-assist';

export type ContactScanSavedLead = {
  id?: string | null;
  company_name: string;
  contact_name?: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  website?: string | null;
  source_type?: string | null;
  source_label?: string | null;
  next_follow_up_at?: string | null;
  lead_type?: 'buyer' | 'supplier' | null;
};

export type ContactAfterSaveGuidanceNudge = {
  id: string;
  title: string;
  detail: string;
  timing: string;
  emphasis: 'do_now' | 'next' | 'optional';
  recommendedOwner: string;
  preferredChannel: string;
  whyRelevant: string;
};

export type ContactAfterSaveRoleLens = {
  label: string;
  summary: string;
  preferredChannel: string;
  recommendedOwner: string;
  reason: string;
};

export type ContactAfterSaveOutreachSuggestion = {
  id: string;
  title: string;
  messageAngle: string;
  recommendedChannel: string;
  recommendedOwner: string;
  timing: string;
  whyRelevant: string;
};

export type ContactAfterSaveVCardAssist = {
  title: string;
  recommendation: string;
  preferredMoment: string;
  channel: string;
  whyItHelps: string;
};

export type ContactAfterSaveReuseHook = {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  timing: string;
  reason: string;
};

export type ContactAfterSaveGuidanceResult = {
  summary: string;
  statusLabel: 'Saved with duplicate caution' | 'Saved and ready for outreach prep' | 'Saved but verify contact path';
  roleLens: ContactAfterSaveRoleLens;
  leadTypeLens: string;
  relevanceSignals: string[];
  outreachSuggestions: ContactAfterSaveOutreachSuggestion[];
  exchangeLoopSummary: string;
  contactReuseHooks: ContactAfterSaveReuseHook[];
  vcardIntegrationMoments: ContactAfterSaveReuseHook[];
  vcardAssist: ContactAfterSaveVCardAssist;
  nextStepNudges: ContactAfterSaveGuidanceNudge[];
  guardrails: string[];
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeHost(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return '';
  return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? '';
}

function normalizeEmailDomain(value: string | null | undefined) {
  const email = normalizeText(value);
  if (!email.includes('@')) return '';
  return email.split('@')[1] ?? '';
}

function formatFollowUp(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  return normalized.includes('T') ? normalized.replace('T', ' ').slice(0, 16) : normalized;
}

function isContactScanSource(value: string | null | undefined) {
  return normalizeText(value).startsWith('contact_scan');
}

function inferRoleLens(args: {
  jobTitle?: string | null;
  leadType?: 'buyer' | 'supplier' | null;
  ownerLabel: string;
  hasDirectContactMethod: boolean;
}) : ContactAfterSaveRoleLens {
  const title = normalizeText(args.jobTitle);
  const ownerLabel = args.ownerLabel;

  if (/procurement|purchase|purchasing|buyer|buying|sourcing|category|supply chain/.test(title)) {
    return {
      label: 'Procurement / buying contact',
      summary: 'Role-aware next touch: lead with commercial fit, supply confidence, and a concise proof of why SETU Flow should stay easy to respond to.',
      preferredChannel: args.hasDirectContactMethod ? 'Email first, phone second' : 'Email or phone after verification',
      recommendedOwner: ownerLabel,
      reason: 'Detected procurement or sourcing language in the saved job title.',
    };
  }

  if (/sales|commercial|business development|bizdev|growth|channel|partnership|marketing/.test(title)) {
    return {
      label: 'Commercial / channel contact',
      summary: 'Role-aware next touch: frame the first outreach around revenue motion, market fit, or partnership value instead of a generic introduction.',
      preferredChannel: args.hasDirectContactMethod ? 'Email with fast follow-up call' : 'Email after route verification',
      recommendedOwner: ownerLabel,
      reason: 'Detected commercial, channel, or growth language in the saved job title.',
    };
  }

  if (/ceo|chief|founder|owner|president|managing director|director|head|vp|vice president|gm|general manager/.test(title)) {
    return {
      label: 'Leadership / decision-maker contact',
      summary: 'Role-aware next touch: keep the first message short, strategic, and respectful of executive attention, then hand deeper follow-up to the working owner if needed.',
      preferredChannel: args.hasDirectContactMethod ? 'Short email with crisp CTA' : 'Email after validating decision-maker route',
      recommendedOwner: `${ownerLabel} or account owner`,
      reason: 'Detected leadership language in the saved job title.',
    };
  }

  if (/operations|operation|coordinator|assistant|admin|administration|office|support|desk/.test(title)) {
    return {
      label: 'Operations / coordinator contact',
      summary: 'Role-aware next touch: confirm routing, team context, and who actually owns the buying decision before treating this as a fully qualified outreach path.',
      preferredChannel: args.hasDirectContactMethod ? 'Phone or email for routing confirmation' : 'Verification step before outreach',
      recommendedOwner: `${ownerLabel} or lead operator`,
      reason: 'Detected coordinator or operations language in the saved job title.',
    };
  }

  if (args.leadType === 'supplier') {
    return {
      label: 'Supplier-side contact',
      summary: 'Role-aware next touch: keep the follow-up practical and qualification-led so supplier context is captured without making the workflow heavy.',
      preferredChannel: args.hasDirectContactMethod ? 'Email first' : 'Verification step before outreach',
      recommendedOwner: ownerLabel,
      reason: 'Lead is currently staged as supplier-facing and no stronger role signal was detected.',
    };
  }

  return {
    label: 'General business contact',
    summary: 'Role-aware next touch: personalize the first outreach lightly using the saved company and scan context, then confirm role depth on the first reply.',
    preferredChannel: args.hasDirectContactMethod ? 'Email first' : 'Verification before outreach',
    recommendedOwner: ownerLabel,
    reason: 'No stronger role signal was detected, so the outreach should stay broad but still relevant.',
  };
}

function buildRelevanceSignals(args: {
  duplicateRisk: boolean;
  hasDirectContactMethod: boolean;
  hasDomainSignal: boolean;
  followUpLabel: string;
  roleLens: ContactAfterSaveRoleLens;
  lead: ContactScanSavedLead;
}) {
  const signals: string[] = [];
  if (args.duplicateRisk) signals.push('Strong duplicate hint was present before save');
  if (args.hasDirectContactMethod) signals.push('Direct contact route is already present on the saved lead');
  if (args.hasDomainSignal) signals.push('Website or email domain can support account routing');
  if (args.followUpLabel) signals.push(`First follow-up is already scheduled for ${args.followUpLabel}`);
  if (args.lead.source_label) signals.push(`Saved from ${String(args.lead.source_label).trim()}`);
  signals.push(`Role lens: ${args.roleLens.label}`);
  return signals.slice(0, 5);
}

function buildRoleAwareNudge(args: { roleLens: ContactAfterSaveRoleLens; hasDirectContactMethod: boolean; }): ContactAfterSaveGuidanceNudge {
  const { roleLens, hasDirectContactMethod } = args;
  return {
    id: 'role-aware-next-touch',
    title: 'Role-aware next touch',
    detail: roleLens.summary,
    timing: hasDirectContactMethod ? 'Before the first outreach goes out' : 'Immediately after contact verification',
    emphasis: hasDirectContactMethod ? 'next' : 'do_now',
    recommendedOwner: roleLens.recommendedOwner,
    preferredChannel: roleLens.preferredChannel,
    whyRelevant: roleLens.reason,
  };
}

function inferLeadTypeLens(leadType?: 'buyer' | 'supplier' | null) {
  if (leadType === 'buyer') return 'Buyer-facing outreach should feel commercial, concise, and easy to reply to.';
  if (leadType === 'supplier') return 'Supplier-facing outreach should feel qualification-led, operationally clear, and low-friction.';
  return 'Lead-type context is still broad, so keep the first touch adaptable and lightweight.';
}

function buildOutreachSuggestions(args: { lead: ContactScanSavedLead; roleLens: ContactAfterSaveRoleLens; ownerLabel: string; hasDirectContactMethod: boolean; hasDomainSignal: boolean; }): ContactAfterSaveOutreachSuggestion[] {
  const leadType = args.lead.lead_type;
  const direct = args.hasDirectContactMethod;
  const channel = direct ? args.roleLens.preferredChannel : 'Verify route first, then email';
  const suggestions: ContactAfterSaveOutreachSuggestion[] = [];

  if (leadType === 'buyer') {
    suggestions.push({
      id: 'buyer-commercial-first-touch',
      title: 'Buyer-first outreach suggestion',
      messageAngle: 'Lead with commercial relevance, response ease, and one clear reason this contact should engage now rather than receiving a long introduction.',
      recommendedChannel: channel,
      recommendedOwner: args.ownerLabel,
      timing: direct ? 'First working session after save' : 'After contact route verification',
      whyRelevant: 'Lead is typed as buyer-facing, so first touch should emphasize fit and speed rather than operational detail.',
    });
  }

  if (leadType === 'supplier') {
    suggestions.push({
      id: 'supplier-qualification-first-touch',
      title: 'Supplier-first outreach suggestion',
      messageAngle: 'Keep the first message qualification-led: confirm capability, category fit, geography, and who should handle the working conversation.',
      recommendedChannel: channel,
      recommendedOwner: args.ownerLabel,
      timing: direct ? 'Before enrichment drifts too far' : 'Immediately after route verification',
      whyRelevant: 'Lead is typed as supplier-facing, so clarity and routing matter more than a polished commercial pitch.',
    });
  }

  suggestions.push({
    id: 'role-aware-message-angle',
    title: 'Role-aware message angle',
    messageAngle: args.roleLens.summary,
    recommendedChannel: channel,
    recommendedOwner: args.roleLens.recommendedOwner,
    timing: 'Before the first outbound touch',
    whyRelevant: args.roleLens.reason,
  });

  if (args.hasDomainSignal) {
    suggestions.push({
      id: 'account-context-touch',
      title: 'Account-context outreach suggestion',
      messageAngle: 'Use the saved company and domain context to make the first outreach feel informed, but keep it short enough that the lead can respond without friction.',
      recommendedChannel: direct ? 'Email with one clear CTA' : 'Email after route check',
      recommendedOwner: args.ownerLabel,
      timing: 'Same day as manual save',
      whyRelevant: 'Website or domain signals are present, so the first touch can be personalized lightly without turning into a research workflow.',
    });
  }

  return suggestions.slice(0, 3);
}

function buildVCardAssist(args: { lead: ContactScanSavedLead; hasDirectContactMethod: boolean; duplicateRisk: boolean; }): ContactAfterSaveVCardAssist {
  const leadType = args.lead.lead_type;
  if (args.hasDirectContactMethod) {
    return {
      title: 'vCard-assisted first touch',
      recommendation: leadType === 'supplier'
        ? 'Use your premium SETU Flow vCard as a lightweight identity close in the first supplier-facing outreach so the contact gets an immediate, credible callback path.'
        : 'Use your premium SETU Flow vCard in the first outreach or reply so the saved contact can immediately see who is reaching out and how to respond.',
      preferredMoment: args.duplicateRisk ? 'After duplicate caution is resolved' : 'On the first outbound message or reply',
      channel: 'Email signature, message close, or QR/share follow-up',
      whyItHelps: 'vCard-assisted first-touch recommendations keep outbound sharing premium while staying lightweight for the operator.',
    };
  }
  return {
    title: 'vCard-assisted first touch',
    recommendation: 'Prepare to use your premium SETU Flow vCard as soon as a direct route is verified so the first live contact feels polished without adding workflow weight.',
    preferredMoment: 'Immediately after direct email or phone routing is confirmed',
    channel: 'Email signature, WhatsApp share, or QR follow-up',
    whyItHelps: 'The scan created the record, and the vCard can now help the first outbound touch feel credible and easy to continue.',
  };
}

function buildContactReuseHooks(args: { lead: ContactScanSavedLead; hasDirectContactMethod: boolean; hasDomainSignal: boolean; duplicateRisk: boolean; ownerLabel: string; }): ContactAfterSaveReuseHook[] {
  const hooks: ContactAfterSaveReuseHook[] = [
    {
      id: 'reopen-contact-exchange-share',
      title: 'Reopen the outbound share surface',
      detail: 'The captured lead is now saved. Move directly from inbound capture into outbound sharing by opening your premium My Digital vCard before the first reply goes out.',
      actionLabel: 'Open My Digital vCard',
      href: '/contact-exchange/vcard',
      timing: args.duplicateRisk ? 'After duplicate caution is resolved' : 'Right before first outreach',
      reason: 'This closes the Global Contact Exchange loop: capture their contact, then share yours beautifully.',
    },
    {
      id: 'recheck-share-preview',
      title: 'Use the public-ready share preview',
      detail: 'Preview the exact card the contact will see so the first-touch handoff stays polished, especially when the lead is hot and the response window is short.',
      actionLabel: 'Open share preview',
      href: '/contact-exchange/vcard/preview',
      timing: 'Same session as save',
      reason: 'Previewing the premium share surface keeps outbound quality high without adding another workflow.',
    },
  ];

  if (args.hasDirectContactMethod) {
    hooks.push({
      id: 'reuse-captured-contact-route',
      title: 'Reuse the captured contact route immediately',
      detail: 'Because email or phone is already present, the operator can move straight into a first-touch sequence without re-entering the contact data anywhere else.',
      actionLabel: 'Stay in saved lead',
      href: PRODUCT_ROUTES.app.leads,
      timing: 'Immediate next action',
      reason: 'The save payload already contains the captured route, so the next step should stay lightweight.',
    });
  } else if (args.hasDomainSignal) {
    hooks.push({
      id: 'reuse-domain-context',
      title: 'Reuse company/domain context for routing',
      detail: 'Use the saved domain or website signal to place the lead in the right account context before the first outbound share moment.',
      actionLabel: 'Stay in saved lead',
      href: PRODUCT_ROUTES.app.leads,
      timing: 'After save review',
      reason: 'Domain context is already on the saved record and can improve the first-touch handoff.',
    });
  }

  return hooks.slice(0, 3);
}

function buildVCardIntegrationMoments(args: { hasDirectContactMethod: boolean; duplicateRisk: boolean; leadType?: 'buyer' | 'supplier' | null; }): ContactAfterSaveReuseHook[] {
  return [
    {
      id: 'vcard-first-touch',
      title: 'First-touch vCard moment',
      detail: args.leadType === 'supplier'
        ? 'When the first supplier-facing message goes out, add the vCard as the identity close so the response path feels credible and easy to continue.'
        : 'When the first outreach email or message goes out, attach or reference the vCard so the exchange feels reciprocal instead of one-sided data capture.',
      actionLabel: 'Open My Digital vCard',
      href: '/contact-exchange/vcard',
      timing: args.duplicateRisk ? 'After duplicate caution is resolved' : (args.hasDirectContactMethod ? 'First outbound touch' : 'After direct route verification'),
      reason: 'This is the cleanest point to convert captured inbound context into outbound share value.',
    },
    {
      id: 'vcard-follow-up-preview',
      title: 'Follow-up preview moment',
      detail: 'Use the preview route before sending a QR or share link so the handoff stays premium even when the outreach itself is lightweight.',
      actionLabel: 'Preview shared vCard',
      href: '/contact-exchange/vcard/preview',
      timing: 'Before sending QR or share link',
      reason: 'The preview lets the operator verify the exact premium share surface without leaving the workflow family.',
    },
  ];
}

export function buildContactScanAfterSaveGuidance(args: { lead: ContactScanSavedLead; ownerLabel?: string | null; postApplyAssist?: ContactPostApplyAssistResult | null; }): ContactAfterSaveGuidanceResult | null {
  const lead = args.lead;
  if (!isContactScanSource(lead.source_type)) return null;

  const duplicateRisk = Boolean(args.postApplyAssist?.duplicateMatches.some((match) => match.strength === 'strong'));
  const hasDirectContactMethod = Boolean(normalizeText(lead.email) || normalizeText(lead.phone) || normalizeText(lead.phone_secondary));
  const hasDomainSignal = Boolean(normalizeHost(lead.website) || normalizeEmailDomain(lead.email));
  const followUpLabel = formatFollowUp(lead.next_follow_up_at);
  const ownerLabel = String(args.ownerLabel ?? '').trim() || 'lead owner';
  const roleLens = inferRoleLens({ jobTitle: lead.job_title, leadType: lead.lead_type, ownerLabel, hasDirectContactMethod });

  const nextStepNudges: ContactAfterSaveGuidanceNudge[] = [];
  const leadTypeLens = inferLeadTypeLens(lead.lead_type);
  if (duplicateRisk) {
    nextStepNudges.push({
      id: 'record-why-net-new',
      title: 'Record why this stayed net-new',
      detail: 'A strong duplicate hint existed before save. Add one short note or CRM comment explaining why this saved lead should remain separate from the suggested match.',
      timing: 'Do now after save',
      emphasis: 'do_now',
      recommendedOwner: ownerLabel,
      preferredChannel: 'CRM note',
      whyRelevant: 'Strong duplicate risk still needs a human-closeout step after the manual save.',
    });
  }

  nextStepNudges.push({
    id: followUpLabel ? 'keep-follow-up' : 'schedule-follow-up',
    title: followUpLabel ? 'Keep the first follow-up locked' : 'Schedule the first follow-up',
    detail: followUpLabel
      ? `This lead already carries a follow-up at ${followUpLabel}. Keep that commitment visible so scan momentum does not stall after save.`
      : `Set a first follow-up within 24 hours so the saved contact scan does not become passive data in the CRM. Route it to ${ownerLabel} if ownership is already clear.`,
    timing: followUpLabel ? 'Already set' : 'Within 24 hours',
    emphasis: 'do_now',
    recommendedOwner: ownerLabel,
    preferredChannel: 'Task or follow-up queue',
    whyRelevant: followUpLabel ? 'A saved follow-up already exists and should stay visible.' : 'Manual save is complete, but momentum still depends on a fast next step.',
  });

  nextStepNudges.push(buildRoleAwareNudge({ roleLens, hasDirectContactMethod }));

  nextStepNudges.push({
    id: hasDirectContactMethod ? 'send-vcard' : 'verify-contact-route',
    title: hasDirectContactMethod ? 'Use your vCard in the first outreach' : 'Verify a direct contact route',
    detail: hasDirectContactMethod
      ? 'When the first email or message goes out, attach or share the premium SETU Flow contact card so the exchange feels reciprocal, fast, and sales-first.'
      : 'The lead is saved, but direct outreach data is still thin. Verify email or phone before handing this into a live outreach queue.',
    timing: hasDirectContactMethod ? 'First outreach touch' : 'Before outreach begins',
    emphasis: hasDirectContactMethod ? 'next' : 'do_now',
    recommendedOwner: hasDirectContactMethod ? ownerLabel : `${ownerLabel} or lead operator`,
    preferredChannel: hasDirectContactMethod ? 'Email, message, or QR share' : 'Verification call or research pass',
    whyRelevant: hasDirectContactMethod
      ? 'The saved lead already has enough contact data to make the exchange feel reciprocal.'
      : 'Direct outreach is still risky until one usable route is confirmed.',
  });

  if (hasDomainSignal || !duplicateRisk) {
    nextStepNudges.push({
      id: hasDomainSignal ? 'account-routing' : 'context-enrichment',
      title: hasDomainSignal ? 'Route into the right account context' : 'Add missing account context',
      detail: hasDomainSignal
        ? 'Use the saved website or email domain to line this lead up with the right account, territory, or buying group without changing the save path.'
        : 'Capture website, LinkedIn, or company context on the next touch so future routing and ownership decisions stay cleaner.',
      timing: hasDomainSignal ? 'After save review' : 'Next qualification pass',
      emphasis: 'optional',
      recommendedOwner: hasDomainSignal ? `${ownerLabel} or account owner` : ownerLabel,
      preferredChannel: hasDomainSignal ? 'CRM routing / account review' : 'Qualification follow-up',
      whyRelevant: hasDomainSignal
        ? 'Domain context is available now and can improve routing quality.'
        : 'Context is still thin, so later routing quality depends on enrichment.',
    });
  }

  const exchangeLoopSummary = hasDirectContactMethod
    ? 'Capture is complete and the saved lead is now ready for a lightweight capture-to-share handoff using My Digital vCard.'
    : 'Capture is complete; verify the route, then hand off into the premium outbound vCard surface without adding a second workflow.';

  const statusLabel: ContactAfterSaveGuidanceResult['statusLabel'] = duplicateRisk
    ? 'Saved with duplicate caution'
    : hasDirectContactMethod
      ? 'Saved and ready for outreach prep'
      : 'Saved but verify contact path';

  const summary = duplicateRisk
    ? 'Manual save is complete. Keep momentum, but close the duplicate-decision loop before the record enters routine follow-up.'
    : hasDirectContactMethod
      ? 'Manual save is complete. The lead is now ready for role-aware next-step nudges without introducing automation.'
      : 'Manual save is complete. Verify the contact route first so the lead becomes truly outreach-ready.';

  return {
    summary,
    statusLabel,
    roleLens,
    leadTypeLens,
    relevanceSignals: buildRelevanceSignals({ duplicateRisk, hasDirectContactMethod, hasDomainSignal, followUpLabel, roleLens, lead }),
    outreachSuggestions: buildOutreachSuggestions({ lead, roleLens, ownerLabel, hasDirectContactMethod, hasDomainSignal }),
    exchangeLoopSummary,
    contactReuseHooks: buildContactReuseHooks({ lead, hasDirectContactMethod, hasDomainSignal, duplicateRisk, ownerLabel }),
    vcardIntegrationMoments: buildVCardIntegrationMoments({ hasDirectContactMethod, duplicateRisk, leadType: lead.lead_type }),
    vcardAssist: buildVCardAssist({ lead, hasDirectContactMethod, duplicateRisk }),
    nextStepNudges: nextStepNudges.slice(0, 4),
    guardrails: [
      'After-save guidance appears only after the manual save completes.',
      'No outreach, merge, or ownership change is triggered automatically.',
      'Lead-type-aware outreach suggestions and vCard-assisted first-touch recommendations stay advisory and keep the same CRM save path intact.',
      'These nudges continue the workflow lightly; they do not replace operator judgment.',
    ],
  };
}
