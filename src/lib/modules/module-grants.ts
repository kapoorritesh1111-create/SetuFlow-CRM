export const MODULE_KEYS = ['full_crm', 'trade_show', 'orders_compliance', 'setu_guru', 'analytics', 'vcard'] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type OrgModuleGrant = {
  module_key: ModuleKey;
  enabled: boolean;
};

export type ModuleDefinition = {
  key: ModuleKey;
  title: string;
  subtitle: string;
  routes: readonly string[];
};

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    key: 'full_crm',
    title: 'Full CRM',
    subtitle: 'Dashboard, leads, pipeline, quotes, tasks, catalog, and core CRM workspaces.',
    routes: ['/dashboard', '/leads', '/pipeline', '/quotes', '/tasks', '/products'],
  },
  {
    key: 'trade_show',
    title: 'Trade Show',
    subtitle: 'Trade event setup, booth capture, contact exchange, and event conversion flows.',
    routes: ['/trade-events', '/contact-exchange/scan'],
  },
  {
    key: 'orders_compliance',
    title: 'Orders + Compliance',
    subtitle: 'Accepted quote execution, orders, documents, and compliance readiness flows.',
    routes: ['/orders', '/documents', '/compliance', '/approval-send'],
  },
  {
    key: 'setu_guru',
    title: 'Setu Guru',
    subtitle: 'Embedded CRM guidance and route-aware assistant experiences.',
    routes: ['/admin/guru-config'],
  },
  {
    key: 'analytics',
    title: 'Analytics',
    subtitle: 'Dashboard analytics, AI analytics, reporting, and leadership insight surfaces.',
    routes: ['/dashboard/analytics', '/reports', '/admin/ai-analytics'],
  },
  {
    key: 'vcard',
    title: 'vCard',
    subtitle: 'My Card, QR share links, public card pages, and vCard download flows.',
    routes: ['/contact-exchange/vcard', '/card'],
  },
];

const DEFAULT_ENABLED_MODULES = new Set<ModuleKey>(MODULE_KEYS);

export function normalizeModuleKey(value: unknown): ModuleKey | null {
  return MODULE_KEYS.find((key) => key === value) ?? null;
}

export function getEnabledModuleSet(grants: readonly OrgModuleGrant[] | null | undefined) {
  if (!grants || grants.length === 0) return new Set(DEFAULT_ENABLED_MODULES);
  const enabled = new Set<ModuleKey>();
  for (const grant of grants) {
    const key = normalizeModuleKey(grant.module_key);
    if (key && grant.enabled) enabled.add(key);
  }
  return enabled;
}

export function isModuleEnabled(enabledModules: ReadonlySet<ModuleKey>, moduleKey: ModuleKey) {
  return enabledModules.has(moduleKey);
}

export function getModuleForPath(pathname: string): ModuleDefinition | null {
  const cleanPath = pathname.split('?')[0] || '/';
  return MODULE_DEFINITIONS.find((moduleDef) => moduleDef.routes.some((route) => cleanPath === route || cleanPath.startsWith(route + '/'))) ?? null;
}

export function isPathEnabled(pathname: string, enabledModules: ReadonlySet<ModuleKey>) {
  const moduleDef = getModuleForPath(pathname);
  return !moduleDef || enabledModules.has(moduleDef.key);
}

export function getModuleForNavHref(href: string): ModuleDefinition | null {
  return getModuleForPath(href);
}
