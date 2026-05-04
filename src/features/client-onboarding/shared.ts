export const DEFAULT_SETU_FLOW_LOGO = '/logos/setu-flow-logo.png';
export const ROOT_DOMAIN = 'setuflowcrm.com';
export const ADMIN_ONBOARDING_EMAIL = 'admin@setugroups.com';

export const defaultPipelineStages = ['New lead', 'Qualified', 'Samples / documents', 'Quote sent', 'Negotiation', 'Won', 'Lost'];
export const defaultPipelines = ['Buyer pipeline', 'Supplier pipeline'];
export const defaultNextSteps = ['Call back', 'Send catalog', 'Send quote', 'Share sample details', 'Follow up after trade show', 'Schedule meeting'];
export const defaultMarkets = ['North America', 'Middle East', 'Europe', 'Asia Pacific'];

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

export function normalizeList(value: FormDataEntryValue | null | undefined) {
  return String(value ?? '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function checked(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}
