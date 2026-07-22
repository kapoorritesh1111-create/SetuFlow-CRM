import type { SetuIconName } from '@/components/ui/setu-icon';

/**
 * S24-SPEN-215 — per-family icon + color, built entirely from existing design
 * tokens (brand / accent / success / warning / danger / info triads) so this
 * doesn't add any new arbitrary colors to the token-governance ratchet.
 */
export type FamilyVisual = { icon: SetuIconName; bg: string; fg: string };

const DEFAULT_VISUAL: FamilyVisual = { icon: 'box', bg: 'bg-surface-2', fg: 'text-content-secondary' };

export const FAMILY_VISUALS: Record<string, FamilyVisual> = {
  'digital-labels': { icon: 'tag', bg: 'bg-info-bg', fg: 'text-info-fg' },
  'stand-up-pouches': { icon: 'pouch', bg: 'bg-danger-bg', fg: 'text-danger-fg' },
  'digital-shrink-sleeves': { icon: 'ribbon', bg: 'bg-accent-100', fg: 'text-accent-700' },
  'digital-flexible-packaging': { icon: 'layers', bg: 'bg-success-bg', fg: 'text-success-fg' },
  'prototypes-mockups': { icon: 'cube', bg: 'bg-brand-100', fg: 'text-brand-700' },
  'variable-data-printing': { icon: 'barcode', bg: 'bg-warning-bg', fg: 'text-warning-fg' },
  '3d-packshots': { icon: 'camera', bg: 'bg-info-bg', fg: 'text-info-fg' },
  'pre-press': { icon: 'check', bg: 'bg-success-bg', fg: 'text-success-fg' },
  'packaging-add-ons': { icon: 'plus', bg: 'bg-accent-100', fg: 'text-accent-700' },
};

export function getFamilyVisual(slug: string): FamilyVisual {
  return FAMILY_VISUALS[slug] ?? DEFAULT_VISUAL;
}
