'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CostProfile = {
  provider: 'resend' | 'cloudmersive';
  plan_key: string;
  display_name: string;
  monthly_base_cost_usd: number | null;
  included_quantity: number | null;
  overage_unit_size: number | null;
  overage_unit_cost_usd: number | null;
  hard_limit_quantity: number | null;
  max_file_bytes: number | null;
  source_url: string | null;
  verified_at: string | null;
  notes: string | null;
};

type ProviderSetting = { provider: 'resend' | 'cloudmersive'; active_plan_key: string };

type Props = { profiles: CostProfile[]; settings: ProviderSetting[] };

function money(value: number | null) {
  if (value === null) return 'Not configured';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo`;
}

function quantity(value: number | null) {
  return value === null ? 'Contract / unknown' : Number(value).toLocaleString();
}

function bytes(value: number | null) {
  if (!value) return '—';
  const mb = value / 1_000_000;
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

export function ProviderCostControls({ profiles, settings }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [local, setLocal] = useState<Record<string, string>>(() => Object.fromEntries(settings.map(item => [item.provider, item.active_plan_key])));
  const grouped = useMemo(() => ({
    resend: profiles.filter(profile => profile.provider === 'resend'),
    cloudmersive: profiles.filter(profile => profile.provider === 'cloudmersive'),
  }), [profiles]);

  async function save(provider: 'resend' | 'cloudmersive') {
    setSaving(provider);
    setMessage('');
    const response = await fetch('/api/smc/mail-provider-cost-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, planKey: local[provider] }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok || payload.error) {
      setMessage(payload.error ?? 'Unable to update provider cost profile.');
      setSaving(null);
      return;
    }
    setMessage(`${provider === 'resend' ? 'Resend' : 'Cloudmersive'} cost profile updated.`);
    setSaving(null);
    router.refresh();
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        {(['resend', 'cloudmersive'] as const).map(provider => {
          const options = grouped[provider];
          const selectedKey = local[provider] ?? settings.find(item => item.provider === provider)?.active_plan_key ?? options[0]?.plan_key ?? '';
          const selected = options.find(option => option.plan_key === selectedKey) ?? null;
          return (
            <div key={provider} style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94a3b8', fontWeight: 800 }}>{provider}</div>
                  <strong style={{ fontSize: 14, color: '#1f487c' }}>{selected?.display_name ?? 'No profile'}</strong>
                </div>
                <span style={{ borderRadius: 999, background: selected?.monthly_base_cost_usd === null ? '#fff7ed' : '#ecfdf5', color: selected?.monthly_base_cost_usd === null ? '#c2410c' : '#047857', padding: '4px 8px', fontSize: 10, fontWeight: 800 }}>
                  {selected?.monthly_base_cost_usd === null ? 'Needs setup' : 'Cost ready'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 11 }}>
                <div><span style={{ color: '#94a3b8' }}>Base</span><strong style={{ display: 'block', marginTop: 2 }}>{money(selected?.monthly_base_cost_usd ?? null)}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>Included</span><strong style={{ display: 'block', marginTop: 2 }}>{quantity(selected?.included_quantity ?? null)}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>Hard cap</span><strong style={{ display: 'block', marginTop: 2 }}>{quantity(selected?.hard_limit_quantity ?? null)}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>Max file</span><strong style={{ display: 'block', marginTop: 2 }}>{bytes(selected?.max_file_bytes ?? null)}</strong></div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <select value={selectedKey} onChange={event => setLocal(value => ({ ...value, [provider]: event.target.value }))} style={{ flex: 1, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', background: '#fff', color: '#0f172a', fontSize: 11 }}>
                  {options.map(option => <option key={option.plan_key} value={option.plan_key}>{option.display_name}</option>)}
                </select>
                <button type="button" className="smc-btn primary" onClick={() => save(provider)} disabled={saving === provider}>{saving === provider ? 'Saving…' : 'Save'}</button>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                {selected?.notes ?? 'No cost notes.'}
                {selected?.source_url ? <> <a href={selected.source_url} target="_blank" rel="noreferrer" style={{ color: '#1f487c', fontWeight: 700 }}>Official pricing ↗</a></> : null}
              </div>
            </div>
          );
        })}
      </div>
      {message ? <div style={{ border: '1px solid #dbe4ef', borderRadius: 10, background: '#f8fafc', padding: '8px 10px', fontSize: 11, color: '#475569' }}>{message}</div> : null}
    </div>
  );
}
