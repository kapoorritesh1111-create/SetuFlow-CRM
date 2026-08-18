import type { IcpProfile } from '@/lib/setu-guru/icp';

export type PackagingVerticalProfile = {
  vertical?: string;
  packaging_families?: string[];
  end_use_sectors?: string[];
  materials?: string[];
  print_methods?: string[];
  quantity_bands?: string[];
  artwork_states?: string[];
  sustainability_needs?: string[];
  regulated_uses?: string[];
  services?: string[];
  lead_time_priorities?: string[];
};

export type PackagingFitInput = {
  country?: string | null;
  companyType?: string | null;
  jobTitle?: string | null;
  productsOrNeeds?: string | null;
  mainProductCategory?: string | null;
  industryMetadata?: Record<string, unknown> | null;
  sourceEvidence?: Record<string, unknown>[] | null;
};

export type PackagingFitResult = {
  score: number;
  reasons: string[];
  penalties: string[];
  missingData: string[];
  matchedCategories: string[];
  matchedUseCases: string[];
  buyerNeedSignals: string[];
  decisionMakerRoles: string[];
};

export type PackagingProcessRecommendation = {
  process: 'digital' | 'flexo' | 'rotogravure' | 'service_only' | 'needs_review';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  assumptions: string[];
};

export type PackagingOpportunityValue = {
  low: number | null;
  high: number | null;
  currency: string;
  basis: Record<string, unknown>;
  confidence: 'low' | 'medium' | 'high';
};

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value: unknown) => normalize(value).split(/\s+/).filter((token) => token.length > 2);
const unique = <T,>(values: T[]) => Array.from(new Set(values));
const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
const containsAny = (haystack: string, needles: string[]) => needles.some((needle) => haystack.includes(normalize(needle)));

export function getPackagingVerticalProfile(icp: IcpProfile | null | undefined): PackagingVerticalProfile {
  const profile = (icp?.vertical_profile ?? {}) as PackagingVerticalProfile;
  return {
    vertical: profile.vertical,
    packaging_families: asStringArray(profile.packaging_families),
    end_use_sectors: asStringArray(profile.end_use_sectors),
    materials: asStringArray(profile.materials),
    print_methods: asStringArray(profile.print_methods),
    quantity_bands: asStringArray(profile.quantity_bands),
    artwork_states: asStringArray(profile.artwork_states),
    sustainability_needs: asStringArray(profile.sustainability_needs),
    regulated_uses: asStringArray(profile.regulated_uses),
    services: asStringArray(profile.services),
    lead_time_priorities: asStringArray(profile.lead_time_priorities),
  };
}

const FAMILY_ALIASES: Record<string, string[]> = {
  'Stand-up pouches': ['stand up pouch', 'standup pouch', 'doypack', 'zipper pouch'],
  'Flat pouches': ['flat pouch', 'two side seal'],
  'Three-side-seal pouches': ['three side seal', '3 side seal', '3ss pouch'],
  'Center-seal pouches': ['center seal', 'centre seal', 'pillow pouch'],
  'Roll stock': ['roll stock', 'rollstock', 'web film', 'forming film'],
  Sachets: ['sachet', 'stick pack', 'single serve'],
  Labels: ['label', 'digital label', 'pressure sensitive'],
  'Shrink sleeves': ['shrink sleeve', 'sleeve label'],
  'Flexible packaging': ['flexible packaging', 'laminate', 'printed film'],
  'Prototype packaging': ['prototype', 'mockup', 'sample pouch'],
  '3D packshots': ['3d packshot', 'packshot render', 'e commerce render'],
  'Artwork and pre-press': ['artwork', 'pre press', 'prepress', 'dieline'],
  'Variable data printing': ['variable data', 'qr code', 'serialization', 'personalization'],
};

const SECTOR_ALIASES: Record<string, string[]> = {
  Food: ['food', 'snack', 'spice', 'cereal', 'bakery', 'frozen', 'pet food'],
  Beverage: ['beverage', 'drink', 'water', 'juice', 'soda'],
  Nutraceutical: ['nutraceutical', 'supplement', 'protein', 'vitamin'],
  Pharmaceutical: ['pharma', 'pharmaceutical', 'medicine', 'tablet', 'strip packaging'],
  Cosmetics: ['cosmetic', 'beauty', 'skincare', 'personal care'],
  Household: ['detergent', 'household', 'cleaning'],
};

const BUYER_ROLE_TERMS = ['procurement', 'purchase', 'packaging', 'supply chain', 'operations', 'brand manager', 'marketing', 'founder', 'quality', 'compliance', 'product development'];
const NEED_SIGNAL_TERMS = ['launch', 'new range', 'scaling', 'rollout', 'refresh', 'switching supplier', 'low moq', 'urgent', 'sample', 'prototype', 'sustainable', 'recyclable', 'food contact'];

function matchedLabels(text: string, aliases: Record<string, string[]>, configured: string[] = []) {
  const labels = Object.entries(aliases)
    .filter(([label, terms]) => (!configured.length || configured.some((item) => normalize(item) === normalize(label))) && containsAny(text, [label, ...terms]))
    .map(([label]) => label);
  return unique(labels);
}

export function scorePackagingFit(input: PackagingFitInput, icp: IcpProfile | null): PackagingFitResult {
  const reasons: string[] = [];
  const penalties: string[] = [];
  const missingData: string[] = [];
  const profile = getPackagingVerticalProfile(icp);
  const metadata = input.industryMetadata ?? {};
  const evidenceText = (input.sourceEvidence ?? []).map((item) => Object.values(item).join(' ')).join(' ');
  const text = normalize([
    input.productsOrNeeds,
    input.mainProductCategory,
    input.companyType,
    input.jobTitle,
    evidenceText,
    JSON.stringify(metadata),
  ].join(' '));

  let score = 10;
  const configuredFamilies = profile.packaging_families ?? [];
  const matchedCategories = matchedLabels(text, FAMILY_ALIASES, configuredFamilies);
  if (matchedCategories.length) {
    score += Math.min(35, 18 + (matchedCategories.length - 1) * 5);
    reasons.push(`Packaging need matches ${matchedCategories.join(', ')}.`);
  } else {
    missingData.push('Packaging family or service need');
    penalties.push('No clear Packaging family match is recorded.');
  }

  const matchedUseCases = matchedLabels(text, SECTOR_ALIASES, profile.end_use_sectors ?? []);
  if (matchedUseCases.length) {
    score += Math.min(18, 10 + (matchedUseCases.length - 1) * 4);
    reasons.push(`End-use sector matches ${matchedUseCases.join(', ')}.`);
  }

  const targetCountries = icp?.target_countries ?? [];
  if (input.country && targetCountries.some((country) => normalize(country) === normalize(input.country))) {
    score += 12;
    reasons.push(`Located in target market ${input.country}.`);
  } else if (targetCountries.length && input.country) {
    penalties.push('Country is outside the configured target markets.');
    score -= 4;
  } else if (!input.country) {
    missingData.push('Country');
  }

  const buyerTypes = icp?.buyer_types ?? [];
  const companyType = normalize(input.companyType);
  if (companyType && buyerTypes.some((type) => companyType.includes(normalize(type)) || normalize(type).includes(companyType))) {
    score += 12;
    reasons.push('Company type matches the Packaging buyer profile.');
  } else if (!input.companyType) {
    missingData.push('Company type');
  }

  const decisionMakerRoles = BUYER_ROLE_TERMS.filter((term) => text.includes(normalize(term)));
  if (decisionMakerRoles.length) {
    score += Math.min(10, decisionMakerRoles.length * 4);
    reasons.push('Relevant Packaging decision-maker role is present.');
  }

  const buyerNeedSignals = NEED_SIGNAL_TERMS.filter((term) => text.includes(normalize(term)));
  if (buyerNeedSignals.length) {
    score += Math.min(12, buyerNeedSignals.length * 4);
    reasons.push(`Buying signal detected: ${buyerNeedSignals.slice(0, 3).join(', ')}.`);
  }

  const materialMatches = (profile.materials ?? []).filter((material) => text.includes(normalize(material)));
  if (materialMatches.length) {
    score += Math.min(8, materialMatches.length * 3);
    reasons.push(`Material requirement matches ${materialMatches.join(', ')}.`);
  }

  const processMatches = (profile.print_methods ?? []).filter((method) => text.includes(normalize(method)));
  if (processMatches.length) {
    score += Math.min(8, processMatches.length * 3);
    reasons.push(`Print-method signal matches ${processMatches.join(', ')}.`);
  }

  if (!text) missingData.push('Packaging need evidence');
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    penalties,
    missingData: unique(missingData),
    matchedCategories,
    matchedUseCases,
    buyerNeedSignals: unique(buyerNeedSignals),
    decisionMakerRoles: unique(decisionMakerRoles),
  };
}

function numericFromText(value: unknown): number | null {
  const matches = String(value ?? '').replace(/,/g, '').match(/\b\d{3,9}\b/g);
  if (!matches?.length) return null;
  return Math.max(...matches.map(Number).filter(Number.isFinite));
}

export function recommendPackagingPrintProcess(input: {
  quantity?: number | null;
  annualVolume?: number | null;
  designCount?: number | null;
  turnaroundDays?: number | null;
  variableData?: boolean | null;
  serviceOnly?: boolean | null;
}): PackagingProcessRecommendation {
  const quantity = Number(input.quantity ?? 0);
  const annual = Number(input.annualVolume ?? 0);
  const designs = Math.max(1, Number(input.designCount ?? 1));
  const assumptions: string[] = [];

  if (input.serviceOnly) return { process: 'service_only', reason: 'This opportunity is for design/pre-press/packshot service rather than a print run.', confidence: 'high', assumptions };
  if (input.variableData) return { process: 'digital', reason: 'Variable data or serialized artwork requires a digital workflow.', confidence: 'high', assumptions: ['Substrate and finishing compatibility still require operator review.'] };
  if (!quantity && !annual) return { process: 'needs_review', reason: 'Quantity or annual volume is required before recommending digital, flexo, or rotogravure.', confidence: 'low', assumptions: ['No run quantity was available.'] };

  const run = quantity || annual;
  if (run <= 10000 || designs >= 8 || Number(input.turnaroundDays ?? 999) <= 10) {
    return { process: 'digital', reason: 'Lower run length, multiple designs, or short turnaround generally favors digital printing with lower setup burden.', confidence: 'medium', assumptions: ['Configured template economics must confirm the break-even point.'] };
  }
  if (run >= 500000 && designs <= 4) {
    return { process: 'rotogravure', reason: 'Very high repeat volume with stable artwork can justify rotogravure cylinder setup and lower long-run unit economics.', confidence: 'medium', assumptions: ['Cylinder cost, repeat frequency, substrate, and local converter capability must be reviewed.'] };
  }
  return { process: 'flexo', reason: 'Medium-to-high volume with repeatable artwork generally fits flexographic production economics.', confidence: 'medium', assumptions: ['Plate/cylinder setup and configured MOQ tiers must be compared with digital alternatives.'] };
}

export function estimatePackagingOpportunityValue(input: {
  quantity?: number | null;
  annualVolume?: number | null;
  indicativeUnitPrice?: number | null;
  setupCost?: number | null;
  currency?: string | null;
  sourceText?: string | null;
}): PackagingOpportunityValue {
  const volume = Number(input.annualVolume ?? input.quantity ?? numericFromText(input.sourceText) ?? 0);
  const unit = Number(input.indicativeUnitPrice ?? 0);
  const setup = Number(input.setupCost ?? 0);
  const currency = String(input.currency || 'USD').toUpperCase();
  if (!volume || !unit) {
    return { low: null, high: null, currency, confidence: 'low', basis: { volume: volume || null, indicative_unit_price: unit || null, setup_cost: setup || null, missing: ['volume and configured indicative unit price'] } };
  }
  const base = volume * unit + setup;
  return {
    low: Math.round(base * 0.8),
    high: Math.round(base * 1.2),
    currency,
    confidence: input.annualVolume && input.indicativeUnitPrice ? 'medium' : 'low',
    basis: { volume, indicative_unit_price: unit, setup_cost: setup, range_factor: '±20%', advisory_only: true },
  };
}

export function packagingSalesDiscoveryChecklist(existing: Record<string, unknown> = {}) {
  const fields = [
    ['packed_product', 'Product being packed'], ['net_fill', 'Net fill weight or volume'], ['packaging_format', 'Packaging format'],
    ['dimensions', 'Dimensions'], ['material_structure', 'Material structure'], ['barrier_requirement', 'Barrier requirement'],
    ['shelf_life_goal', 'Shelf-life goal'], ['filling_conditions', 'Filling and sealing conditions'], ['special_process', 'Retort, frozen, or hot-fill requirement'],
    ['print_process', 'Print process'], ['print_colors', 'Number of colors'], ['finish', 'Finish'], ['closures', 'Zipper, spout, valve, or hang-hole'],
    ['artwork_status', 'Artwork status'], ['dieline_status', 'Dieline status'], ['design_count', 'Number of SKUs or designs'],
    ['order_quantity', 'Order quantity'], ['annual_volume', 'Annual volume'], ['delivery_location', 'Delivery location'],
    ['target_launch_date', 'Target launch date'], ['current_supplier', 'Current supplier'], ['current_price', 'Current price'],
    ['switch_reason', 'Reason for switching'], ['sample_requirement', 'Sample or prototype requirement'],
    ['certification_requirement', 'Certification requirement'], ['sustainability_requirement', 'Sustainability requirement'],
  ] as const;
  const missing = fields.filter(([key]) => !String(existing[key] ?? '').trim()).map(([key, label]) => ({ key, label }));
  return { fields: fields.map(([key, label]) => ({ key, label, value: existing[key] ?? null })), missing, completion: Math.round(((fields.length - missing.length) / fields.length) * 100) };
}

export function packagingComplianceLibrary() {
  return [
    { topic: 'Food-contact packaging', evidence: ['Material declaration', 'Overall migration report', 'Specific migration report where applicable'], boundary: 'Confirm destination and end-use requirements with qualified compliance review.' },
    { topic: 'Inks and adhesives', evidence: ['Ink compliance declaration', 'Adhesive compliance declaration', 'Low-migration statement where required'], boundary: 'Supplier declarations do not replace application-specific testing.' },
    { topic: 'Restricted substances', evidence: ['Heavy-metals declaration', 'Restricted-substances declaration', 'Certificate of analysis where applicable'], boundary: 'Requirements vary by market and material.' },
    { topic: 'Sustainability claims', evidence: ['Recyclability assessment', 'Recycled-content evidence', 'Compostability certification for certified claims'], boundary: 'Do not publish environmental claims without market-specific substantiation.' },
    { topic: 'Paper and fiber claims', evidence: ['FSC or PEFC chain-of-custody evidence where claimed'], boundary: 'Trademark and claim use requires valid certification scope.' },
    { topic: 'Regulated formats', evidence: ['Tamper-evidence validation', 'Child-resistant test evidence', 'Pharma/cosmetic compatibility evidence'], boundary: 'Human compliance approval is mandatory.' },
    { topic: 'Artwork and variable data', evidence: ['Approved artwork', 'Dieline', 'Barcode verification', 'Variable-data verification record'], boundary: 'Setu Guru may identify missing evidence but cannot approve artwork or data.' },
  ];
}

export function buildPackagingOutreachDraft(input: { companyName: string; need?: string | null; matchedCategories?: string[]; missing?: string[] }) {
  const category = input.matchedCategories?.[0] || 'packaging';
  const need = input.need ? ` based on your requirement for ${input.need}` : '';
  const missing = input.missing?.length ? ` To recommend the right structure and process, we would first confirm ${input.missing.slice(0, 4).join(', ')}.` : '';
  return {
    subject: `${category} support for ${input.companyName}`,
    body: `Hi, I’m reaching out from Setu Flow’s packaging network. We may be able to support ${input.companyName}${need}.${missing} Once those inputs are confirmed, we can prepare a reviewable specification, MOQ/process recommendation, and commercial quote.`,
    approvalRequired: true,
  };
}
