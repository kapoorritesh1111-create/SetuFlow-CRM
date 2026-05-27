export const DEFAULT_SETU_FLOW_LOGO = '/logos/setu-flow-logo.png';
export const ROOT_DOMAIN = 'setuflowcrm.com';
export const ADMIN_ONBOARDING_EMAIL = 'admin@setugroups.com';

export const defaultPipelineStages = ['New lead', 'Qualified', 'Samples / documents', 'Quote sent', 'Negotiation', 'Won', 'Lost'];
export const defaultPipelines = ['Buyer pipeline', 'Supplier pipeline'];
export const defaultNextSteps = ['Call back', 'Send catalog', 'Send quote', 'Share sample details', 'Follow up after trade show', 'Schedule meeting'];
export const defaultMarkets = ['North America', 'Middle East', 'Europe', 'Asia Pacific'];

const KNOWN_LIST_VALUES = [
  ...defaultPipelineStages,
  ...defaultPipelines,
  ...defaultNextSteps,
  ...defaultMarkets,
  'South Asia',
  'Africa',
  'Latin America',
  'Southeast Asia',
  'GCC',
  'Australia',
  'United States',
  'United Arab Emirates',
  'India',
  'United Kingdom',
  'Saudi Arabia',
  'Germany',
  'Singapore',
  'Canada',
];

export function slugifyCompanyName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54) || 'new-client';
}

export function buildWorkspaceDomain(companyName: string) {
  return `${slugifyCompanyName(companyName)}.${ROOT_DOMAIN}`;
}

export function normalizeText(value: FormDataEntryValue | null | undefined) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

export function normalizeEmail(value: FormDataEntryValue | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function splitConcatenatedKnownValues(value: string) {
  const matches = KNOWN_LIST_VALUES.filter((item) => value.includes(item));
  return matches.length > 1 ? matches : [value];
}

export function normalizeList(value: FormDataEntryValue | FormDataEntryValue[] | null | undefined) {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(new Set(values
    .flatMap((entry) => String(entry ?? '').split(/\r?\n|,|;/))
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap(splitConcatenatedKnownValues)));
}

export function normalizeFormList(formData: FormData, key: string) {
  const values = formData.getAll(key);
  return normalizeList(values.length > 0 ? values : formData.get(key));
}

export function checked(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}
