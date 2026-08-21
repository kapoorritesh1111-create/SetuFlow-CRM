import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export type SeoConversionEvent = {
  channel: string;
  landingPage: string | null;
  createdAt: string;
};

export type SeoConversionSnapshot = {
  status: 'connected' | 'not_configured' | 'error';
  message: string;
  baselineDate: string;
  totalDemoRequests: number;
  organicDemoRequests: number;
  paidSearchDemoRequests: number;
  socialDemoRequests: number;
  referralDemoRequests: number;
  directDemoRequests: number;
  recent: SeoConversionEvent[];
};

const DEFAULT_BASELINE_DATE = '2026-08-21';

function empty(status: SeoConversionSnapshot['status'], message: string, baselineDate: string): SeoConversionSnapshot {
  return {
    status,
    message,
    baselineDate,
    totalDemoRequests: 0,
    organicDemoRequests: 0,
    paidSearchDemoRequests: 0,
    socialDemoRequests: 0,
    referralDemoRequests: 0,
    directDemoRequests: 0,
    recent: [],
  };
}

export async function getSeoConversionSnapshot(): Promise<SeoConversionSnapshot> {
  const baselineDate = process.env.SEO_BASELINE_DATE?.trim() || DEFAULT_BASELINE_DATE;
  // This table is introduced by the same release. Keep access behind the
  // service-role client until generated DB types are refreshed post-migration.
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return empty('not_configured', 'Supabase service-role access is required for marketing attribution.', baselineDate);

  try {
    const { data, error } = await admin
      .from('marketing_conversion_events')
      .select('channel,landing_page,created_at')
      .eq('event_name', 'demo_request')
      .gte('created_at', `${baselineDate}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      const missing = error.code === '42P01' || /marketing_conversion_events/i.test(error.message || '');
      return empty(
        missing ? 'not_configured' : 'error',
        missing ? 'Marketing attribution table is not deployed yet.' : error.message,
        baselineDate,
      );
    }

    const rows = (data ?? []) as Array<{ channel: string; landing_page: string | null; created_at: string }>;
    const count = (channel: string) => rows.filter((row) => row.channel === channel).length;
    return {
      status: 'connected',
      message: `Demo attribution captured from ${baselineDate} onward.`,
      baselineDate,
      totalDemoRequests: rows.length,
      organicDemoRequests: count('organic_search'),
      paidSearchDemoRequests: count('paid_search'),
      socialDemoRequests: count('social'),
      referralDemoRequests: count('referral'),
      directDemoRequests: count('direct'),
      recent: rows.slice(0, 10).map((row) => ({
        channel: row.channel,
        landingPage: row.landing_page,
        createdAt: row.created_at,
      })),
    };
  } catch (error) {
    return empty('error', error instanceof Error ? error.message : 'Marketing attribution could not be loaded.', baselineDate);
  }
}
