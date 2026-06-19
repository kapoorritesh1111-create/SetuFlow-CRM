import { createClient } from '@/lib/supabase/server';

export type FlagRow = {
  id?: string;
  flag_key: string;
  name?: string;
  description?: string | null;
  enabled: boolean;
  rollout_percentage: number;
  allowed_orgs?: string[] | null;
  blocked_orgs?: string[] | null;
};

/** Deterministic per-(flag, org) bucketing so rollout is stable across requests. */
function inRollout(flagKey: string, orgId: string, pct: number): boolean {
  if (pct >= 100) return true;
  if (pct <= 0) return false;
  let h = 0;
  const s = `${flagKey}:${orgId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100 < pct;
}

/**
 * Feature flags are a rollout overlay on top of granted modules: a flag can only
 * gate a feature the org already has the module for. Resolution rules:
 *   - unknown flag key  -> fail OPEN (true), so ungated features are never hidden
 *   - disabled flag     -> false
 *   - blocked org       -> false (block always wins)
 *   - allow-list set and org not in it -> false
 *   - otherwise         -> deterministic rollout bucket
 */
export async function isFeatureEnabled(flagKey: string, orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('smc_feature_flags')
    .select('flag_key, enabled, rollout_percentage, allowed_orgs, blocked_orgs')
    .eq('flag_key', flagKey)
    .maybeSingle();
  return evaluateFlag(data as FlagRow | null, orgId);
}

/** Pure evaluation, exported for unit testing without a DB. */
export function evaluateFlag(flag: FlagRow | null, orgId: string): boolean {
  if (!flag) return true; // unknown key => fail open
  if (!flag.enabled) return false;
  if (flag.blocked_orgs?.includes(orgId)) return false;
  if (flag.allowed_orgs && flag.allowed_orgs.length > 0 && !flag.allowed_orgs.includes(orgId)) return false;
  return inRollout(flag.flag_key, orgId, flag.rollout_percentage);
}
