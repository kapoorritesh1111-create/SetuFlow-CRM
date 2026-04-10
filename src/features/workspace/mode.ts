import type { WorkspaceMode } from './types';

export function parseWorkspaceMode(value?: string | string[]): WorkspaceMode {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === 'buyers' || candidate === 'buyer') return 'buyers';
  if (candidate === 'suppliers' || candidate === 'supplier') return 'suppliers';
  return 'all';
}

export function workspaceModeToLeadJourney(mode: WorkspaceMode): '' | 'buyer' | 'supplier' {
  if (mode === 'buyers') return 'buyer';
  if (mode === 'suppliers') return 'supplier';
  return '';
}

export function leadJourneyToWorkspaceMode(value?: '' | 'buyer' | 'supplier' | null): WorkspaceMode {
  if (value === 'buyer') return 'buyers';
  if (value === 'supplier') return 'suppliers';
  return 'all';
}

export function leadTypeMatchesMode(leadType: 'buyer' | 'supplier', mode: WorkspaceMode): boolean {
  if (mode === 'all') return true;
  return mode === 'buyers' ? leadType === 'buyer' : leadType === 'supplier';
}
