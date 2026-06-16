import { randomUUID } from 'crypto';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type { PublicCardIdentity } from '@/lib/contact-exchange/public-card';
import { type MyCardSettingsInput, type MyCardSettingsRow } from '@/lib/contact-exchange/my-card-settings-shared';

type PublicCardContextFields = {
  trade_show_name?: string | null;
  booth_number?: string | null;
};

function sanitizeText(value?: string | null) {
  return String(value ?? '').trim();
}

function sanitizeUrl(value?: string | null) {
  return sanitizeText(value);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function buildShareSlug(seed: string) {
  const base = slugify(seed) || 'card';
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function getMyCardSettingsForUser(userId: string): Promise<MyCardSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('my_card_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;

    const message = String(error.message || 'Unable to load My Card settings.');
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes('my_card_settings') ||
      lowerMessage.includes('relation') ||
      lowerMessage.includes('schema cache') ||
      lowerMessage.includes('permission denied')
    ) {
      return null;
    }

    throw new Error(message);
  }

  return (data as MyCardSettingsRow | null) ?? null;
}

export async function upsertMyCardSettingsForUser(args: {
  userId: string;
  organizationId: string | null;
  fullName: string;
  email: string;
  input: MyCardSettingsInput;
}): Promise<MyCardSettingsRow> {
  const supabase = await createClient();
  const existing = await getMyCardSettingsForUser(args.userId);
  const shareSlug = existing?.share_slug || buildShareSlug(args.fullName || args.email);

  const payload: Database['public']['Tables']['my_card_settings']['Insert'] = {
    user_id: args.userId,
    organization_id: args.organizationId,
    share_slug: shareSlug,
    primary_phone: sanitizeText(args.input.primaryPhone),
    secondary_phone: sanitizeText(args.input.secondaryPhone) || null,
    website: sanitizeUrl(args.input.website) || null,
    address: sanitizeText(args.input.address) || null,
    booking_url: sanitizeUrl(args.input.bookingUrl) || null,
    quote_url: sanitizeUrl(args.input.quoteUrl) || null,
    linkedin_url: sanitizeUrl(args.input.linkedin) || null,
    instagram_url: sanitizeUrl(args.input.instagram) || null,
    facebook_url: sanitizeUrl(args.input.facebook) || null,
    tiktok_url: sanitizeUrl(args.input.tiktok) || null,
    is_public: true,
    updated_at: new Date().toISOString(),
  };

  const myCardSettingsTable = supabase.from('my_card_settings') as any;
  const { data, error } = await myCardSettingsTable
    .upsert(payload as any, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Unable to save My Card settings.');
  return data as MyCardSettingsRow;
}

export async function getPublicCardByShareSlug(shareSlug: string) {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  const { data: settings, error } = await admin
    .from('my_card_settings')
    .select('*, profiles!my_card_settings_user_id_fkey(id, full_name, email, avatar_url), organizations(id, name, logo_url)')
    .eq('share_slug', shareSlug)
    .eq('is_public', true)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw new Error(error.message || 'Unable to load public card.');
  if (!settings) return null;

  const profile = Array.isArray(settings.profiles) ? settings.profiles[0] : settings.profiles;
  const organization = Array.isArray(settings.organizations) ? settings.organizations[0] : settings.organizations;
  const context = settings as PublicCardContextFields;

  const identity: PublicCardIdentity = {
    fullName: profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'SETU Flow contact',
    roleLabel: 'Global trade contact',
    organizationName: organization?.name || 'SETU Flow',
    email: profile?.email || 'hello@setuflow.com',
    primaryPhone: settings.primary_phone?.trim() || 'Phone shared after save',
    secondaryPhone: settings.secondary_phone?.trim() || null,
    website: settings.website?.trim() || null,
    address: settings.address?.trim() || null,
    avatarUrl: profile?.avatar_url || null,
    logoUrl: organization?.logo_url || null,
    bookingUrl: settings.booking_url?.trim() || null,
    quoteUrl: settings.quote_url?.trim() || null,
    organizationId: settings.organization_id,
    tradeShowName: context.trade_show_name?.trim() || null,
    boothNumber: context.booth_number?.trim() || null,
    socials: {
      linkedin: settings.linkedin_url?.trim() || null,
      instagram: settings.instagram_url?.trim() || null,
      facebook: settings.facebook_url?.trim() || null,
      tiktok: settings.tiktok_url?.trim() || null,
    },
  };

  return { identity, settings };
}
