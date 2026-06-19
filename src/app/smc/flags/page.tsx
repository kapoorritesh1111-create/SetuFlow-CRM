import { createClient } from '@/lib/supabase/server';
import { FlagEditor } from './flag-editor';

export const dynamic = 'force-dynamic';

type Flag = {
  id: string; flag_key: string; name: string; description: string | null;
  enabled: boolean; rollout_percentage: number;
};

async function getFlags(): Promise<Flag[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('smc_feature_flags').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Flag[];
}

export default async function SmcFlagsPage() {
  const flags = await getFlags();
  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Config</div><h1>Feature Flags</h1></div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{flags.length}</div><div className="l">Total Flags</div></div>
        <div className="smc-kp green"><div className="v">{flags.filter((f) => f.enabled).length}</div><div className="l">Enabled</div></div>
        <div className="smc-kp"><div className="v">{flags.filter((f) => !f.enabled).length}</div><div className="l">Disabled</div></div>
      </div>
      <div className="smc-content-page">
        {flags.length === 0 && (
          <p style={{ color: '#94a3b8', marginBottom: 12 }}>No feature flags yet. Use the New Flag button to start controlling rollouts per client org.</p>
        )}
        <FlagEditor flags={flags} />
      </div>
    </>
  );
}
