export type AvatarPresetCategory = 'professional' | 'global' | 'fun' | 'abstract';

export type AvatarPreset = {
  id: string;
  name: string;
  category: AvatarPresetCategory;
  description: string;
  tags: string[];
  url: string;
  order: number;
};

const base = '/avatars/setu-flow-exclusive';

const presetRows: Array<[string, string, AvatarPresetCategory, string]> = [
  ['executive-classic', 'Executive Classic', 'professional', 'A polished business profile with a clean executive look.'],
  ['executive-poise', 'Executive Poise', 'professional', 'A confident leadership style with a refined presentation.'],
  ['operator-core', 'Operator Core', 'professional', 'A practical operations profile with a modern workplace feel.'],
  ['operator-bright', 'Operator Bright', 'professional', 'A friendly operations profile designed for everyday collaboration.'],
  ['warm-connect', 'Warm Connect', 'professional', 'An approachable client-facing profile with a welcoming tone.'],
  ['warm-presence', 'Warm Presence', 'professional', 'A polished and welcoming profile for relationship-led work.'],
  ['bold-leader', 'Bold Leader', 'global', 'A strong leadership profile with elegant character.'],
  ['strategic-focus', 'Strategic Focus', 'global', 'A thoughtful profile with a calm, strategic presence.'],
  ['minimal-edge', 'Minimal Edge', 'global', 'A refined minimalist profile with a modern edge.'],
  ['modern-professional', 'Modern Professional', 'global', 'A sharp contemporary profile suited to collaborative teams.'],
  ['creative-spark', 'Creative Spark', 'fun', 'An expressive creative profile with energetic character.'],
  ['friendly-wave', 'Friendly Wave', 'fun', 'A social and approachable profile with upbeat energy.'],
  ['explorer-play', 'Explorer Play', 'fun', 'An adventurous and upbeat option with lively spirit.'],
  ['artistic-pop', 'Artistic Pop', 'fun', 'A colorful artistic profile with bold expression.'],
  ['monogram-classic', 'Monogram Classic', 'abstract', 'An elegant Setu Flow monogram identity.'],
  ['geometric-orbit', 'Geometric Orbit', 'abstract', 'A futuristic orbit-inspired concept with premium brand feel.'],
  ['abstract-mosaic', 'Abstract Mosaic', 'abstract', 'A premium color-block abstract portrait.'],
  ['gradient-wave', 'Gradient Wave', 'abstract', 'A fluid gradient silhouette with movement and depth.'],
  ['studio-sketch', 'Studio Sketch', 'abstract', 'An editorial sketch portrait with a creative studio vibe.'],
  ['pattern-muse', 'Pattern Muse', 'global', 'A decorative portrait with richly detailed pattern work.'],
];

export const SETU_FLOW_AVATAR_PRESETS: AvatarPreset[] = presetRows.map(([id, name, category, description], index) => ({
  id,
  name,
  category,
  description,
  tags: [category, 'setu-flow', 'exclusive'],
  url: `${base}/avatar-${String(index + 1).padStart(2, '0')}-${id}.png`,
  order: index + 1,
}));

export const AVATAR_PRESET_CATEGORIES: Array<{ id: 'all' | AvatarPresetCategory; label: string }> = [
  { id: 'all', label: 'All avatars' },
  { id: 'professional', label: 'Professional' },
  { id: 'global', label: 'Featured' },
  { id: 'fun', label: 'Creative' },
  { id: 'abstract', label: 'Abstract' },
];

export function isSetuFlowAvatarPresetUrl(value?: string | null) {
  return /^\/avatars\/setu-flow-exclusive\/avatar-[a-z0-9-]+\.(svg|png)$/i.test(String(value ?? '').trim());
}
