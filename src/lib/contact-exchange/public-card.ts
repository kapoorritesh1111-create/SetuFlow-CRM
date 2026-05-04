export type PublicCardSocialLinks = {
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
};

export type PublicCardIdentity = {
  fullName: string;
  roleLabel: string;
  organizationName: string;
  email: string;
  primaryPhone: string;
  secondaryPhone?: string | null;
  website?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  bookingUrl?: string | null;
  quoteUrl?: string | null;
  organizationId?: string | null;
  socials?: PublicCardSocialLinks;
};


function isShareSafeAssetUrl(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return false;
  // Data URLs from phone uploads can be thousands of characters long and break
  // QR, .vcf and copied links. Only stable http(s) assets belong in URLs.
  if (/^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return trimmed.length <= 500;
}

export function getShareSafeAssetUrl(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  return isShareSafeAssetUrl(trimmed) ? trimmed : undefined;
}

function normalizeUrl(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function buildPublicCardSearchParams(identity: PublicCardIdentity) {
  const params = new URLSearchParams();
  const entries: Record<string, string | undefined> = {
    name: identity.fullName,
    role: identity.roleLabel,
    org: identity.organizationName,
    email: identity.email,
    phone: identity.primaryPhone,
    phone2: identity.secondaryPhone ?? undefined,
    web: identity.website ? normalizeUrl(identity.website) : undefined,
    addr: identity.address ?? undefined,
    avatar: getShareSafeAssetUrl(identity.avatarUrl),
    logo: getShareSafeAssetUrl(identity.logoUrl),
    book: identity.bookingUrl ? normalizeUrl(identity.bookingUrl) : undefined,
    quote: identity.quoteUrl ? normalizeUrl(identity.quoteUrl) : undefined,
    orgId: identity.organizationId ?? undefined,
    linkedin: identity.socials?.linkedin ? normalizeUrl(identity.socials.linkedin) : undefined,
    instagram: identity.socials?.instagram ? normalizeUrl(identity.socials.instagram) : undefined,
    facebook: identity.socials?.facebook ? normalizeUrl(identity.socials.facebook) : undefined,
    tiktok: identity.socials?.tiktok ? normalizeUrl(identity.socials.tiktok) : undefined,
  };

  for (const [key, value] of Object.entries(entries)) {
    if (value && value.trim()) params.set(key, value.trim());
  }

  return params;
}

export function parsePublicCardSearchParams(searchParams: Record<string, string | string[] | undefined>): PublicCardIdentity {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  };

  return {
    fullName: get('name') || get('fullName') || 'SETU Flow contact',
    roleLabel: get('role') || get('roleLabel') || 'Global trade contact',
    organizationName: get('org') || get('organizationName') || 'SETU Flow',
    email: get('email') || 'hello@setuflow.com',
    primaryPhone: get('phone') || 'Phone shared after save',
    secondaryPhone: get('phone2') || null,
    website: get('web') || null,
    address: get('addr') || null,
    avatarUrl: get('avatar') || null,
    logoUrl: get('logo') || null,
    bookingUrl: get('book') || null,
    quoteUrl: get('quote') || null,
    organizationId: get('orgId') || null,
    socials: {
      linkedin: get('linkedin') || null,
      instagram: get('instagram') || null,
      facebook: get('facebook') || null,
      tiktok: get('tiktok') || null,
    },
  };
}
