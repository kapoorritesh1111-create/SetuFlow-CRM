import { PRODUCT_ROUTES } from '@/lib/product-contract';

export type WorkspaceModeParam = 'buyers' | 'suppliers' | 'all' | '' | null | undefined;

function normalizeMode(mode: WorkspaceModeParam) {
  return mode === 'buyers' || mode === 'suppliers' ? mode : null;
}

export function appendQuery(href: string, params: Record<string, string | null | undefined>) {
  const [pathname, hash = ''] = href.split('#');
  const search = new URLSearchParams();
  const [basePath, existingQuery = ''] = pathname.split('?');
  if (existingQuery) {
    new URLSearchParams(existingQuery).forEach((value, key) => search.set(key, value));
  }
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const queryString = search.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}${hash ? `#${hash}` : ''}`;
}

export function withMode(href: string, mode: WorkspaceModeParam) {
  return appendQuery(href, { mode: normalizeMode(mode) });
}

export function buildLeadWorkflowHref(leadId: string, mode?: WorkspaceModeParam, extra?: Record<string, string | null | undefined>) {
  return appendQuery(`/leads/${leadId}`, { mode: normalizeMode(mode), tab: 'workflow', ...extra });
}

export function buildLeadQuoteHref(leadId: string, quoteId?: string | null, mode?: WorkspaceModeParam, extra?: Record<string, string | null | undefined>) {
  return appendQuery(`/leads/${leadId}/quote`, { mode: normalizeMode(mode), quoteId: quoteId ?? null, ...extra });
}

export function buildApprovalSendHref(extra?: Record<string, string | null | undefined>, mode?: WorkspaceModeParam) {
  return appendQuery(PRODUCT_ROUTES.app.integrations, { mode: normalizeMode(mode), ...extra });
}

export function buildOrdersHref(extra?: Record<string, string | null | undefined>, mode?: WorkspaceModeParam) {
  return appendQuery(PRODUCT_ROUTES.app.orders, { mode: normalizeMode(mode), ...extra });
}
