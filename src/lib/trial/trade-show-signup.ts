import { randomUUID } from 'crypto';
import { headers } from 'next/headers';

import { hasSupabaseServiceRole } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { persistActiveOrganization } from '@/lib/workspace/auth';

export type TradeShowTrialSignupInput = {
  fullName: string;
  company: string;
  email: string;
  phoneWhatsapp: string;
  tradeShowName: string;
  boothNumber?: string;
  mainProductCategory?: string;
};

export type TradeShowTrialSignupFieldErrors = Partial<Record<keyof TradeShowTrialSignupInput, string>>;

export type TradeShowTrialSignupResult =
  | {
      ok: true;
      organizationId: string;
      tradeEventId: string | null;
      workspacePath: string;
      signedIn: boolean;
      email: string;
      attachedExistingUser: boolean;
    }
  | { ok: false; message: string; fieldErrors?: TradeShowTrialSignupFieldErrors };

type ProvisionRpcResult = {
  organization_id?: string;
  trade_event_id?: string | null;
  workspace_path?: string;
};

type SupabaseAdminClient = any;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{7,}$/;
const MAX_SIGNUP_ATTEMPTS_PER_WINDOW = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54);
}

function uniqueTrialSlug(company: string) {
  const base = slugify(company) || 'trade-show-trial';
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function buildTemporaryPassword() {
  return `Setu-${randomUUID()}-Aa1!`;
}

function getRequestMetadata() {
  const headerStore = headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const realIp = headerStore.get('x-real-ip') ?? '';
  const ip = forwardedFor || realIp || 'unknown';

  return {
    ip,
    userAgent: headerStore.get('user-agent') ?? '',
    referrer: headerStore.get('referer') ?? headerStore.get('referrer') ?? '',
    submittedAt: new Date().toISOString(),
  };
}

export function validateTradeShowTrialSignup(input: TradeShowTrialSignupInput): {
  value: TradeShowTrialSignupInput;
  fieldErrors: TradeShowTrialSignupFieldErrors;
} {
  const value = {
    fullName: clean(input.fullName),
    company: clean(input.company),
    email: normalizeEmail(input.email),
    phoneWhatsapp: clean(input.phoneWhatsapp),
    tradeShowName: clean(input.tradeShowName),
    boothNumber: clean(input.boothNumber),
    mainProductCategory: clean(input.mainProductCategory),
  };

  const fieldErrors: TradeShowTrialSignupFieldErrors = {};
  if (!value.fullName) fieldErrors.fullName = 'Full name is required.';
  if (!value.company) fieldErrors.company = 'Company is required.';
  if (!value.email) fieldErrors.email = 'Email is required.';
  else if (!EMAIL_RE.test(value.email)) fieldErrors.email = 'Enter a valid email address.';
  if (!value.phoneWhatsapp) fieldErrors.phoneWhatsapp = 'Phone / WhatsApp is required.';
  else if (!PHONE_RE.test(value.phoneWhatsapp)) fieldErrors.phoneWhatsapp = 'Enter a valid phone or WhatsApp number.';
  if (!value.tradeShowName) fieldErrors.tradeShowName = 'Trade show name is required.';

  return { value, fieldErrors };
}

async function checkRateLimit(admin: SupabaseAdminClient, email: string, ip: string) {
  const safeIp = ip || 'unknown';
  const key = `trade_show_trial:${email}:${safeIp}`;
  const now = new Date();

  const { data } = await admin
    .from('rate_limit_hits')
    .select('key, count, window_start')
    .eq('key', key)
    .maybeSingle();

  if (!data) {
    await admin.from('rate_limit_hits').insert({ key, count: 1, window_start: now.toISOString() });
    return { allowed: true };
  }

  const windowStart = data.window_start ? new Date(data.window_start) : now;
  const withinWindow = now.getTime() - windowStart.getTime() < SIGNUP_WINDOW_MS;

  if (!withinWindow) {
    await admin.from('rate_limit_hits').update({ count: 1, window_start: now.toISOString() }).eq('key', key);
    return { allowed: true };
  }

  const count = Number(data.count ?? 0);
  if (count >= MAX_SIGNUP_ATTEMPTS_PER_WINDOW) {
    return { allowed: false, message: 'Too many trial signup attempts. Please try again later or contact help@setugroups.com.' };
  }

  await admin.from('rate_limit_hits').update({ count: count + 1 }).eq('key', key);
  return { allowed: true };
}

async function findAuthUserIdByEmail(admin: SupabaseAdminClient, email: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (profile?.id) return { userId: profile.id as string, fromProfile: true };

  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const matched = usersPage?.users?.find((user: { id: string; email?: string | null }) => normalizeEmail(user.email) === email);
  return matched?.id ? { userId: matched.id as string, fromProfile: false } : null;
}

async function createOrAttachTrialUser(admin: SupabaseAdminClient, input: TradeShowTrialSignupInput) {
  const email = normalizeEmail(input.email);
  const existing = await findAuthUserIdByEmail(admin, email);
  if (existing?.userId) {
    await admin
      .from('profiles')
      .upsert({ id: existing.userId, full_name: input.fullName, email, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return { userId: existing.userId, created: false, temporaryPassword: null as string | null };
  }

  const temporaryPassword = buildTemporaryPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      signup_source: 'trade_show_trial',
      trade_show_name: input.tradeShowName,
      company: input.company,
    },
  });

  if (error || !data.user?.id) {
    throw error ?? new Error('Could not create trial user.');
  }

  await admin
    .from('profiles')
    .upsert({ id: data.user.id, full_name: input.fullName, email, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  return { userId: data.user.id, created: true, temporaryPassword };
}

async function deleteCreatedTrialUser(admin: SupabaseAdminClient, userId: string | null, created: boolean) {
  if (!created || !userId) return;
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Best-effort compensation. The DB RPC is transactional, so only auth cleanup can fail.
  }
}

async function signInNewTrialUser(email: string, temporaryPassword: string | null, organizationId: string) {
  if (!temporaryPassword) return false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: temporaryPassword });
    if (error) return false;
    persistActiveOrganization(organizationId);
    return true;
  } catch {
    return false;
  }
}

export async function provisionTradeShowTrialSignup(rawInput: TradeShowTrialSignupInput): Promise<TradeShowTrialSignupResult> {
  const { value, fieldErrors } = validateTradeShowTrialSignup(rawInput);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please complete the required fields.', fieldErrors };
  }

  if (!hasSupabaseServiceRole) {
    return { ok: false, message: 'Trade Show Trial provisioning is not available in this environment.' };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return { ok: false, message: 'Trade Show Trial provisioning is not configured.' };
  }

  const metadata = getRequestMetadata();
  let createdUser: { userId: string; created: boolean; temporaryPassword: string | null } | null = null;

  try {
    const limit = await checkRateLimit(admin, value.email, metadata.ip);
    if (!limit.allowed) return { ok: false, message: limit.message ?? 'Too many attempts. Please try again later.' };

    createdUser = await createOrAttachTrialUser(admin, value);
    const orgSlug = uniqueTrialSlug(value.company);

    const { data, error } = await admin.rpc('provision_trade_show_trial_workspace', {
      p_user_id: createdUser.userId,
      p_full_name: value.fullName,
      p_company: value.company,
      p_email: value.email,
      p_phone_whatsapp: value.phoneWhatsapp,
      p_trade_show_name: value.tradeShowName,
      p_booth_number: value.boothNumber || null,
      p_main_product_category: value.mainProductCategory || null,
      p_org_slug: orgSlug,
      p_signup_metadata: {
        source: 'trade_show_trial_signup',
        ip: metadata.ip,
        user_agent: metadata.userAgent,
        referrer: metadata.referrer,
        submitted_at: metadata.submittedAt,
      },
    });

    if (error) throw error;

    const payload = (data ?? {}) as ProvisionRpcResult;
    const organizationId = String(payload.organization_id ?? '');
    if (!organizationId) throw new Error('Trial workspace was not created.');

    const signedIn = await signInNewTrialUser(value.email, createdUser.temporaryPassword, organizationId);

    return {
      ok: true,
      organizationId,
      tradeEventId: payload.trade_event_id ?? null,
      workspacePath: payload.workspace_path ?? '/trade-events?trial_started=1&mode=trade_show_trial',
      signedIn,
      email: value.email,
      attachedExistingUser: !createdUser.created,
    };
  } catch (error) {
    await deleteCreatedTrialUser(admin, createdUser?.userId ?? null, Boolean(createdUser?.created));
    const message = error instanceof Error ? error.message : 'Could not start the Trade Show Trial.';
    return { ok: false, message };
  }
}
