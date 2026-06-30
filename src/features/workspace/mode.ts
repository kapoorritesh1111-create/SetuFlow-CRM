import type { WorkspaceMode } from './types';

export type LeadJourneyMode = '' | 'buyer' | 'supplier';

function firstModeToken(value?: string | string[] | null) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return String(candidate ?? '').trim().toLowerCase();
}

export function parseWorkspaceMode(value?: string | string[] | null): WorkspaceMode {
  const candidate = firstModeToken(value);
  if (candidate === 'buyers' || candidate === 'buyer') return 'buyers';
  if (candidate === 'suppliers' || candidate === 'supplier') return 'suppliers';
  return 'all';
}

export function workspaceModeToLeadJourney(mode: WorkspaceMode): LeadJourneyMode {
  if (mode === 'buyers') return 'buyer';
  if (mode === 'suppliers') return 'supplier';
  return '';
}

export function leadJourneyToWorkspaceMode(value?: LeadJourneyMode | null): WorkspaceMode {
  if (value === 'buyer') return 'buyers';
  if (value === 'supplier') return 'suppliers';
  return 'all';
}

export function leadTypeMatchesMode(leadType: 'buyer' | 'supplier', mode: WorkspaceMode): boolean {
  if (mode === 'all') return true;
  return mode === 'buyers' ? leadType === 'buyer' : leadType === 'supplier';
}

export function assertLeadTypeMatchesMode(leadType: 'buyer' | 'supplier', mode: WorkspaceMode) {
  if (!leadTypeMatchesMode(leadType, mode)) {
    throw new Error(`Lead type ${leadType} does not match workspace mode ${mode}.`);
  }
}
