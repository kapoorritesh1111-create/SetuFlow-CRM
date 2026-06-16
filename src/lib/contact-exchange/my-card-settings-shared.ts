import type { Database } from '@/types/database';
import type { PublicCardIdentity } from '@/lib/contact-exchange/public-card';

export type MyCardSettingsRow = Database['public']['Tables']['my_card_settings']['Row'];

type MyCardContextFields = {
  trade_show_name?: string | null;
  booth_number?: string | null;
};

export type MyCardSettingsInput = {
  primaryPhone: string;
  secondaryPhone: string;
  website: string;
  address: string;
  bookingUrl: string;
  quoteUrl: string;
  linkedin: string;
  instagram: string;
  facebook: string;
  tiktok: string;
};

export const EMPTY_CARD_SETTINGS: MyCardSettingsInput = {
  primaryPhone: '',
  secondaryPhone: '',
  website: '',
  address: '',
  bookingUrl: '',
  quoteUrl: '',
  linkedin: '',
  instagram: '',
  facebook: '',
  tiktok: '',
};

function sanitizeText(value?: string | null) {
  return String(value ?? '').trim();
}

function sanitizeUrl(value?: string | null) {
  return sanitizeText(value);
}

export function toCardSettingsInput(row?: Partial<MyCardSettingsRow> | null, defaults?: Partial<MyCardSettingsInput>): MyCardSettingsInput {
  return {
    primaryPhone: sanitizeText(row?.primary_phone) || sanitizeText(defaults?.primaryPhone),
    secondaryPhone: sanitizeText(row?.secondary_phone) || sanitizeText(defaults?.secondaryPhone),
    website: sanitizeUrl(row?.website) || sanitizeUrl(defaults?.website),
    address: sanitizeText(row?.address) || sanitizeText(defaults?.address),
    bookingUrl: sanitizeUrl(row?.booking_url) || sanitizeUrl(defaults?.bookingUrl),
    quoteUrl: sanitizeUrl(row?.quote_url) || sanitizeUrl(defaults?.quoteUrl),
    linkedin: sanitizeUrl(row?.linkedin_url) || sanitizeUrl(defaults?.linkedin),
    instagram: sanitizeUrl(row?.instagram_url) || sanitizeUrl(defaults?.instagram),
    facebook: sanitizeUrl(row?.facebook_url) || sanitizeUrl(defaults?.facebook),
    tiktok: sanitizeUrl(row?.tiktok_url) || sanitizeUrl(defaults?.tiktok),
  };
}

export function mergeIdentityWithCardSettings(identity: PublicCardIdentity, settings?: Partial<MyCardSettingsRow & MyCardContextFields> | null): PublicCardIdentity {
  if (!settings) return identity;
  return {
    ...identity,
    primaryPhone: settings.primary_phone?.trim() || identity.primaryPhone,
    secondaryPhone: settings.secondary_phone?.trim() || identity.secondaryPhone || null,
    website: settings.website?.trim() || identity.website || null,
    address: settings.address?.trim() || identity.address || null,
    bookingUrl: settings.booking_url?.trim() || identity.bookingUrl || null,
    quoteUrl: settings.quote_url?.trim() || identity.quoteUrl || null,
    tradeShowName: settings.trade_show_name?.trim() || identity.tradeShowName || null,
    boothNumber: settings.booth_number?.trim() || identity.boothNumber || null,
    socials: {
      linkedin: settings.linkedin_url?.trim() || identity.socials?.linkedin || null,
      instagram: settings.instagram_url?.trim() || identity.socials?.instagram || null,
      facebook: settings.facebook_url?.trim() || identity.socials?.facebook || null,
      tiktok: settings.tiktok_url?.trim() || identity.socials?.tiktok || null,
    },
  };
}
