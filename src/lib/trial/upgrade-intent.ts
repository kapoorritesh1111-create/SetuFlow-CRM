export const TRIAL_UPGRADE_MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    headline: 'Executive command center',
    description: 'See booth capture velocity, hot-lead movement, open follow-ups, and trade-show ROI in one clean command view.',
    previewLabel: 'Sample booth performance',
    previewBullets: ['Live capture KPIs', 'Follow-up SLA health', 'Event-by-event opportunity trends'],
    sampleMetrics: ['18 captures', '7 hot leads', '3 follow-ups due'],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: '📈',
    headline: 'Conversion and ROI insights',
    description: 'Compare trade shows, booth teams, product categories, quote conversion, and follow-up performance after upgrade.',
    previewLabel: 'Read-only analytics sample',
    previewBullets: ['Capture-to-quote trend', 'Product interest ranking', 'ROI by show'],
    sampleMetrics: ['41% quote ready', 'Mango chips trending', '2.3x follow-up lift'],
  },
  {
    key: 'lead_command_center',
    label: 'Lead Command Center',
    icon: '🎯',
    headline: 'Qualification workspace',
    description: 'Move qualified booth conversations into the full CRM lead pipeline with owners, stages, tasks, and Setu Guru guidance.',
    previewLabel: 'Pipeline preview',
    previewBullets: ['Stage movement', 'Owner assignment', 'Next-best action prompts'],
    sampleMetrics: ['12 active leads', '5 qualified', '2 urgent actions'],
  },
  {
    key: 'quotes',
    label: 'Quotes',
    icon: '📄',
    headline: 'Quote builder preview',
    description: 'Turn qualified event conversations into structured product quotes with versioning, pricing, terms, and PDF handoff.',
    previewLabel: 'Quote workflow sample',
    previewBullets: ['Versioned quote drafts', 'Product line builder', 'Approval-ready PDF'],
    sampleMetrics: ['4 drafts', '2 pending review', '1 ready to send'],
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: '🚚',
    headline: 'Order execution preview',
    description: 'Carry accepted quotes into order execution with document tracking, dispatch status, and delivery handoff after upgrade.',
    previewLabel: 'Order control sample',
    previewBullets: ['Accepted quote handoff', 'Dispatch checklist', 'Document readiness'],
    sampleMetrics: ['2 orders staged', '6 docs tracked', '1 dispatch ready'],
  },
] as const;

export type TrialUpgradeModule = (typeof TRIAL_UPGRADE_MODULES)[number];
export type TrialUpgradeModuleKey = TrialUpgradeModule['key'];
export type TrialUpgradeIntentAction = 'preview_viewed' | 'upgrade_requested';

export function isTrialUpgradeModuleKey(value: string): value is TrialUpgradeModuleKey {
  return TRIAL_UPGRADE_MODULES.some((module) => module.key === value);
}

export function isTrialUpgradeIntentAction(value: string): value is TrialUpgradeIntentAction {
  return value === 'preview_viewed' || value === 'upgrade_requested';
}

export function getTrialUpgradeModule(key: TrialUpgradeModuleKey) {
  return TRIAL_UPGRADE_MODULES.find((module) => module.key === key) ?? TRIAL_UPGRADE_MODULES[0];
}

export function formatTrialIntentAction(action: TrialUpgradeIntentAction) {
  return action === 'upgrade_requested' ? 'Upgrade requested' : 'Preview viewed';
}
