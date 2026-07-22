import type { SetuIconName } from '@/components/ui/setu-icon';

/**
 * S24-SPEN-215 — per-family icon + color, built entirely from existing design
 * tokens (brand / accent / success / warning / danger / info triads) so this
 * doesn't add any new arbitrary colors to the token-governance ratchet.
 */
export type FamilyVisual = { icon: SetuIconName; bg: string; fg: string };

const DEFAULT_VISUAL: FamilyVisual = { icon: 'box', bg: 'bg-surface-2', fg: 'text-content-secondary' };

/** S27-STARK — icon options an admin can pick from when creating/editing a
 * family, each paired with a token-based color so new families still avoid
 * introducing arbitrary colors. */
export const FAMILY_ICON_OPTIONS: { key: SetuIconName; label: string; bg: string; fg: string }[] = [
  { key: 'tag', label: 'Tag', bg: 'bg-info-bg', fg: 'text-info-fg' },
  { key: 'pouch', label: 'Pouch', bg: 'bg-danger-bg', fg: 'text-danger-fg' },
  { key: 'ribbon', label: 'Ribbon', bg: 'bg-accent-100', fg: 'text-accent-700' },
  { key: 'layers', label: 'Layers', bg: 'bg-success-bg', fg: 'text-success-fg' },
  { key: 'cube', label: 'Cube', bg: 'bg-brand-100', fg: 'text-brand-700' },
  { key: 'barcode', label: 'Barcode', bg: 'bg-warning-bg', fg: 'text-warning-fg' },
  { key: 'camera', label: 'Camera', bg: 'bg-info-bg', fg: 'text-info-fg' },
  { key: 'check', label: 'Check', bg: 'bg-success-bg', fg: 'text-success-fg' },
  { key: 'plus', label: 'Plus', bg: 'bg-accent-100', fg: 'text-accent-700' },
  { key: 'box', label: 'Box', bg: 'bg-brand-100', fg: 'text-brand-700' },
];

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

/** iconKey (from the family's own icon_key column) takes priority — this is
 * how an admin-created family gets a real icon instead of the gray default.
 * Falls back to the hardcoded slug map for families seeded before icon_key
 * existed, then to a neutral default. */
export function getFamilyVisual(slug: string, iconKey?: string | null): FamilyVisual {
  if (iconKey) {
    const match = FAMILY_ICON_OPTIONS.find((option) => option.key === iconKey);
    if (match) return { icon: match.key, bg: match.bg, fg: match.fg };
  }
  return FAMILY_VISUALS[slug] ?? DEFAULT_VISUAL;
}
