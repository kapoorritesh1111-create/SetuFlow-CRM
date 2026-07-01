import { PRODUCT_ROUTES } from '@/lib/product-contract';

export type LeadJourney = 'buyer' | 'supplier';

export type JourneyCopy = {
  key: LeadJourney;
  label: string;
  pluralLabel: string;
  dashboardTitle: string;
  dashboardDescription: string;
  leadsTitle: string;
  leadsDescription: string;
  pipelineTitle: string;
  pipelineDescription: string;
  shortContext: string;
  leadsPath: string;
  pipelinePath: string;
  queueLabel: string;
  commandSurfaceLabel: string;
};

export type JourneyTerminology = {
  leadLabel: string;
  leadPluralLabel: string;
  valueLabel: string;
  qualificationLabel: string;
  mappingLabel: string;
  primaryRequestLabel: string;
  primaryOfferLabel: string;
  positiveStageLabel: string;
  negativeStageLabel: string;
  inactiveStageLabel: string;
  primaryActionLabel: string;
  documentActionLabel: string;
  sampleActionLabel: string;
  approvalActionLabel: string;
  rejectionActionLabel: string;
  commandCenterTitle: string;
  commandCenterDescription: string;
};

export const JOURNEY_COPY: Record<LeadJourney, JourneyCopy> = {
  buyer: {
    key: 'buyer',
    label: 'Buyer',
    pluralLabel: 'Buyers',
    dashboardTitle: 'Buyer operations dashboard',
    dashboardDescription: 'Track active buyer demand, stalled follow-ups, and movement toward qualified opportunities using live buyer records only.',
    leadsTitle: 'Buyer leads workspace',
    leadsDescription: 'Qualify demand, route buyer follow-ups, and keep intake separate from supplier sourcing work.',
    pipelineTitle: 'Buyer pipeline',
    pipelineDescription: 'Use buyer-first stage views and filters to move opportunities from prospecting to active commercial discussion.',
    shortContext: 'Demand-side workflow',
    leadsPath: `${PRODUCT_ROUTES.app.leads}?mode=buyers`,
    pipelinePath: '/pipeline/buyers',
    queueLabel: 'Buyer queue',
    commandSurfaceLabel: 'Buyer command surface',
  },
  supplier: {
    key: 'supplier',
    label: 'Supplier',
    pluralLabel: 'Suppliers',
    dashboardTitle: 'Supplier operations dashboard',
    dashboardDescription: 'Monitor sourcing coverage, follow-up risk, and supplier progression without mixing in buyer demand records.',
    leadsTitle: 'Supplier leads workspace',
    leadsDescription: 'Manage sourcing conversations, supplier qualification, and outreach in a dedicated operating lane.',
    pipelineTitle: 'Supplier pipeline',
    pipelineDescription: 'Use supplier-specific stage views and defaults to keep qualification and sourcing workflows clean.',
    shortContext: 'Supply-side workflow',
    leadsPath: `${PRODUCT_ROUTES.app.leads}?mode=suppliers`,
    pipelinePath: '/pipeline/suppliers',
    queueLabel: 'Supplier queue',
    commandSurfaceLabel: 'Supplier command surface',
  },
};

export const JOURNEY_TERMINOLOGY: Record<LeadJourney, JourneyTerminology> = {
  buyer: {
    leadLabel: 'Buyer lead',
    leadPluralLabel: 'Buyer leads',
    valueLabel: 'Deal value',
    qualificationLabel: 'Qualification',
    mappingLabel: 'Product / market mapping',
    primaryRequestLabel: 'RFQ / quote draft',
    primaryOfferLabel: 'Buyer quote',
    positiveStageLabel: 'Won',
    negativeStageLabel: 'Lost',
    inactiveStageLabel: 'Nurture',
    primaryActionLabel: 'Create Quote',
    documentActionLabel: 'Request Buyer Documents',
    sampleActionLabel: 'Share Sample Details',
    approvalActionLabel: 'Mark Qualified',
    rejectionActionLabel: 'Mark Lost',
    commandCenterTitle: 'Buyer command center',
    commandCenterDescription: 'Manage qualification, product fit, quote creation, negotiation, and order conversion for buyer demand.',
  },
  supplier: {
    leadLabel: 'Supplier profile',
    leadPluralLabel: 'Supplier profiles',
    valueLabel: 'Sourcing value',
    qualificationLabel: 'Verification',
    mappingLabel: 'Capability mapping',
    primaryRequestLabel: 'Cost Request',
    primaryOfferLabel: 'Supplier Offer',
    positiveStageLabel: 'Approved Supplier',
    negativeStageLabel: 'Rejected Supplier',
    inactiveStageLabel: 'Inactive Supplier',
    primaryActionLabel: 'Request Cost',
    documentActionLabel: 'Request Documents',
    sampleActionLabel: 'Request Sample',
    approvalActionLabel: 'Approve Supplier',
    rejectionActionLabel: 'Reject Supplier',
    commandCenterTitle: 'Supplier sourcing command center',
    commandCenterDescription: 'Manage supplier verification, capability, compliance readiness, cost requests, approval, demand linkage, and performance.',
  },
};

export function getJourneyTerminology(journey: '' | LeadJourney): JourneyTerminology {
  return JOURNEY_TERMINOLOGY[journey || 'buyer'];
}

export function isPipelineInJourney(pipelineLeadType: 'buyer' | 'supplier' | 'both', journey: '' | LeadJourney) {
  if (!journey) return true;
  return pipelineLeadType === 'both' || pipelineLeadType === journey;
}

export function getJourneyLeadPath(journey: '' | LeadJourney) {
  return journey ? JOURNEY_COPY[journey].leadsPath : PRODUCT_ROUTES.app.leads;
}

export function getJourneyPipelinePath(journey: '' | LeadJourney) {
  return journey ? JOURNEY_COPY[journey].pipelinePath : '/pipeline';
}
